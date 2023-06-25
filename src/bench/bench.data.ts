export const CASES = <const> [
  <const> {
    matrix: <const> [
      <const> ['e', '1', '1', '1', 'b', 'e', '5'],
      <const> ['f', '1', 'b', '5', '1', 'e', '7'],
      <const> ['1', '5', '7', '1', 'b', 'b', 'f'],
      <const> ['7', '7', '7', '5', 'f', '1', 'b'],
      <const> ['1', '7', '7', '5', 'f', '5', '1'],
      <const> ['1', '1', '7', 'b', '1', 'b', '5'],
      <const> ['b', 'f', '7', '5', 'b', 'b', '7'],
    ],
    targets: [
      <const> ['f', '7', '1'],
      <const> ['5', '5', '1', 'b'],
      <const> ['b', '1', '1', 'e'],
    ],
  },
  <const> {
    matrix: [
      <const> ['1', '5', 'f', 'b', 'e'],
      <const> ['b', '1', 'e', 'f', 'e'],
      <const> ['5', 'b', 'f', '1', '1'],
      <const> ['e', 'b', '1', '5', '5'],
      <const> ['5', 'e', 'b', '5', 'f'],
    ],
    targets: [
      <const> ['e', '5'],
      <const> ['5', 'b', 'e'],
      <const> ['f', '1', 'b', 'e'],
      <const> ['5', '1', 'f', '5'],
    ],
  },
];

export const BUFFER_SIZES = <const> [4, 5, 6, 7, 8];
