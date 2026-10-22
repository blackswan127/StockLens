import { useState, useEffect, useCallback } from "react";
import { MacroSeriesId } from "../constants/macroConfig";
import { Observation } from "../utils/macroHelpers";

export type FredSeriesResult = {
  id: MacroSeriesId;
  observations: Observation[];
};

type FredApiObservation = {
  date: string;
  value: string;
};

type FredApiResponse = {
  observations?: FredApiObservation[];
  available?: boolean;
};

const fetchSeries = async (id: MacroSeriesId): Promise<FredSeriesResult> => {
  const url = `/api/macro/${id}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${id}: ${response.status}`);
  }

  const json = (await response.json()) as FredApiResponse;

  if (json.available === false) {
    throw new Error(`Data unavailable for ${id}`);
  }

  if (!Array.isArray(json.observations)) {
    throw new Error(`Invalid observations response for ${id}`);
  }

  const observations: Observation[] = json.observations
    .filter((obs) => obs.value !== ".")
    .map((obs) => ({
      date: obs.date,
      value: parseFloat(obs.value),
    }))
    .filter((obs) => Number.isFinite(obs.value));

  if (observations.length === 0) {
    throw new Error(`Data unavailable for ${id}`);
  }

  return { id, observations };
};

export const useFredSeries = (seriesIds: MacroSeriesId[]) => {
  const [data, setData] = useState<Partial<Record<MacroSeriesId, Observation[]>> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Partial<Record<MacroSeriesId, boolean>>>({});

  const seriesKey = seriesIds.join(",");

  const loadAll = useCallback(async () => {
    const ids = seriesKey ? (seriesKey.split(",") as MacroSeriesId[]) : [];
    setLoading(true);
    const results = await Promise.allSettled(ids.map((id) => fetchSeries(id)));

    const newData: Partial<Record<MacroSeriesId, Observation[]>> = {};
    const newErrors: Partial<Record<MacroSeriesId, boolean>> = {};

    results.forEach((res, index) => {
      const id = ids[index];
      if (res.status === "fulfilled") {
        newData[id] = res.value.observations;
        newErrors[id] = false;
      } else {
        newErrors[id] = true;
      }
    });

    setData((prev) => ({ ...(prev ?? {}), ...newData }));
    setErrors(newErrors);
    setLoading(false);
  }, [seriesKey]);

  const refetch = async (id: MacroSeriesId) => {
    setErrors((prev) => ({ ...prev, [id]: false }));
    try {
      const result = await fetchSeries(id);
      setData((prev) => ({ ...(prev ?? {}), [id]: result.observations }));
    } catch (err: unknown) {
      console.warn(
        `[FRED] Failed to refetch ${id}:`,
        err instanceof Error ? err.message : err
      );
      setErrors((prev) => ({ ...prev, [id]: true }));
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadAll);
  }, [loadAll]);

  return { data, loading, errors, refetch };
};
