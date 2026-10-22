import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '../../test/utils';
import { Table, type Column } from '../Table';

interface Row {
  id: number;
  symbol: string;
  price: number;
}

const columns: Column<Row>[] = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'price', label: 'Price', align: 'right', render: (row) => `$${row.price.toFixed(2)}` },
];

const sortableColumns: Column<Row>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true },
  { key: 'price', label: 'Price', align: 'right', sortable: true },
];

const rows: Row[] = [
  { id: 1, symbol: 'AAPL', price: 190.5 },
  { id: 2, symbol: 'MSFT', price: 420.25 },
];

describe('Table', () => {
  it('renders column headers and rows from props', () => {
    renderWithProviders(<Table columns={columns} data={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Symbol' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$190.50' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'MSFT' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('renders skeleton rows while pending', () => {
    renderWithProviders(<Table columns={columns} data={rows} isPending />);

    expect(screen.getByRole('columnheader', { name: 'Symbol' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(9);
    expect(screen.getAllByRole('cell')).toHaveLength(16);
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
    expect(
      screen.queryByText('No results found matching search parameters')
    ).not.toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Data table' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading table data')).toBeInTheDocument();
  });

  it('renders the empty state when there is no data', () => {
    renderWithProviders(<Table columns={columns} data={[]} />);

    const emptyMessage = screen.getByText('No results found matching search parameters');
    expect(emptyMessage).toBeInTheDocument();
    expect(emptyMessage).toHaveAttribute('role', 'status');
    expect(screen.getByText('Try resetting your screener search filters')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'AAPL' })).not.toBeInTheDocument();
  });

  it('uses scope="col" on header cells', () => {
    renderWithProviders(<Table columns={columns} data={rows} />);

    expect(screen.getByRole('columnheader', { name: 'Symbol' })).toHaveAttribute('scope', 'col');
    expect(screen.getByRole('columnheader', { name: 'Price' })).toHaveAttribute('scope', 'col');
  });

  it('exposes sortable headers as labeled buttons with aria-sort', () => {
    const onSort = vi.fn();
    renderWithProviders(
      <Table
        columns={sortableColumns}
        data={rows}
        sortKey="price"
        sortOrder="desc"
        onSort={onSort}
      />
    );

    const priceHeader = screen.getByRole('columnheader', { name: /price/i });
    expect(priceHeader).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /symbol/i })).toHaveAttribute(
      'aria-sort',
      'none'
    );

    const sortButton = screen.getByRole('button', {
      name: /sort by price, currently descending/i,
    });
    fireEvent.click(sortButton);
    expect(onSort).toHaveBeenCalledWith('price');
  });
});
