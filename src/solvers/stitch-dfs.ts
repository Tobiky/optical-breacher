// TODO: Reduce 'readonly' restrictions, only applied to improve code safety
// TODO: Parallise with Worker (See https://www.npmjs.com/package/workerpool, https://www.npmjs.com/package/paralleljs)

import permu from 'permu';
import * as _ from 'lodash';

const byteMap: Record<string, number> = {
  '1C': 1,
  '7A': 2,
  '55': 3,
  'BD': 4,
  'E9': 5,
  'FF': 6,
}

function normalize_sequence(sequence: readonly string[]): readonly number[] {
  return sequence.map(characters => byteMap[characters])
}

// Get a value that uniquely describes the position
function location_to_id(x: number, y: number): number {
  // Assumed that max matrix length is under 10 and
  // integers are safely represented within +/- 2^52
  // a location can be described using the decimal positions.
  // Also, easy to look at when printed.

  return x * 10 + y;
}

function location_tuple_to_id(location: readonly [number, number]): number {
  // All JS objects only use string accessors, including array indexes.
  return location_to_id(location['0'], location['1']);
}

// Turn back to location from ID
function id_to_location(id: number): readonly [number, number] {
  return [id / 10, id % 10];
}

function stitch(a: readonly number[], b: readonly number[]): number[] {
  for (let i = 0; i < a.length; i++) {
    // Check if the current value of the first sequence
    // matches the first value of the second sequence
    if (a[i] == b[0]) {
      // Check how far the sequences match
      let j = 0;
      while (j < b.length && i + j < a.length && a[i + j] == b[j]) {
        j++;
      }

      // Check if a contains b (j reached b.length)
      if (j == b.length - 1) {
        return a.slice();
      }

      // Check if some start of b equals some start of a 
      // (i + j reached a.length)
      if (i + j == a.length - 1) {
        // Get the first known part of a
        const stitched_sequence = a.slice(0, i);
        // Add b, includes overlap
        stitched_sequence.push(...b);

        return stitched_sequence;
      }
    }
  }

  // No overlap found
  const copy = a.slice();
  copy.push(...b);
  return copy;
}

// Given the original target sequences, the function generates
// possible combinations and permutations for stitching together.
// Includes permutations with less than the length of input sequences.
// Returns a LoDash iterator of list (combinations) of list of
// numbers (target sequences).
function stitch_discovery(
  target_sequences: readonly (readonly number[])[]): _.CollectionChain<{ sequences: number[][], original_sequence_indexes: number[]}> {
  // using indexes instead of sequences directly for smaller values
  const indexes = _.range(0, target_sequences.length);

  // lodash iteration/sequence wrapping
  // range for the length of the permutation
  const stitches = _(_.range(2, target_sequences.length + 1))
    .chain()
    // permutate the indexes with respect to an increasing length
    .flatMap(length => permu(length, indexes))
    // Adds the original indexes so that they can be matched alone
    .push(indexes)
    // map indexes to sequences
    .map(index_permutation => ({
      sequences: index_permutation.map(i => target_sequences[i].slice()),
      original_sequence_indexes:  index_permutation
    }));

  return stitches;
}

// Given the original target sequences and the max length that they
// be, the function generates the possible stitched sequences. This
// includes just one target sequence to permutations of all target
// sequences.
function stitch_sequences(
  target_sequences: readonly (readonly number[])[],
  max_length: number): _.CollectionChain<{sequence: number[], original_sequence_indexes: number[]}> {
  // use the discovered stitch combinations and stitch together
  const stitches = stitch_discovery(target_sequences)
    // stitch together permutations
    .map(sequence_permutation => ({
      sequence: sequence_permutation.sequences.reduce(stitch),
      original_sequence_indexes: sequence_permutation.original_sequence_indexes
    }))
    // get only stitches that are at most max_length in length
    // and is not an empty string
    .filter(sequence_stitch => 0 < sequence_stitch.sequence.length && sequence_stitch.sequence.length <= max_length)
    // sort in from largest to smallest
    .sortBy(sequence_stitch => -sequence_stitch.sequence.length)
    // only unique sequences
    .sortedUniqBy(sequence_stitch => sequence_stitch.sequence.join(''))

  return stitches;
}

// Don't know the max axis length for sure.
// Though, if slice reference is at all possible that would be the fastest since the slice isn't consumed.
const _MAX_MATRIX_LENGTH = 9;
const _MAX_MATRIX_RANGE = _.range(0, _MAX_MATRIX_LENGTH);

// Grab the neighbour coordinates based on the matrix and current path
function cp77_matrix_neighbours(
  matrix: readonly (readonly number[])[],
  path: readonly (readonly [number, number])[],
  passed?: ReadonlySet<number>): [number, number][] {
  // grab the last node of the path to act as an anchor in the chosen direction
  // (either the x or y component is used). (0, 0) will be used as default since
  // that will count as the start, the first horizontal.
  const [static_x, static_y] = _.last(path) ?? [0, 0];

  // since the matrix is always square, any of its sides can be used
  const axis = _(_MAX_MATRIX_RANGE)
    .chain()
    .slice(0, matrix.length);

  // verticle and horizontal always alternate with first (index 0, length 1) being horizontal
  // thus when the length is uneven (2k + 1), check for the 1 bit which will signal verticle
  // neighbours. 
  let neighbours = (path.length & 1) == 1
    ? axis.map<[number, number]>(y => [static_x, y])
    : axis.map<[number, number]>(x => [x, static_y]);

  // If passed locations was used as an argument, check that none
  // of the neighbours made are in the passed set.
  if (passed) {
    neighbours = neighbours
      .filter(location => passed.has(location_tuple_to_id(location)));
  }

  return neighbours
    .commit()
    .value();
}


// allows location id as index, value in slot is the previous
// cell
const traceback = new Array<number>(100);

// Perform a BFS on the given matrix to search for the target sequence.
// Max length is the longest sequence that can be constructed and
// Matrix neighbour function is the function to retreive the neighbours
// at the end of the current path.
// Returns the sequence of coordinates that need to be crossed to acheive
// the sequence, empty if it is not possible.
function matrix_bfs(
  matrix: readonly (readonly number[])[],
  target: readonly number[],
  max_length: number,
  matrix_neighbour_function: (
    matrix: readonly (readonly number[])[],
    path: readonly (readonly [number, number])[],
    passed?: ReadonlySet<number>
  ) => [number, number][] = cp77_matrix_neighbours
): [number, number][]
{
  const passed_locations = new Set<number>();
  const path = new Array<[number, number]>();


  // proceed with BFS until either the path is complete or until
  // there is no more room in the 'buffer'.
  while (path.length < target.length && path.length < max_length) {
    const neighbours = matrix_neighbour_function(matrix, path, passed_locations);

  }

  return path;
}

function solve_normalized(
  matrix: readonly (readonly number[])[],
  targets: readonly (readonly number[])[],
  totalBufferSize: number): _.CollectionChain<{sequence: [number, number][], original_sequence_indexes: number[]}>
{
  return stitch_sequences(targets, totalBufferSize)
    .map(({sequence, original_sequence_indexes}) => ({
      sequence: matrix_bfs(matrix, sequence, totalBufferSize),
      original_sequence_indexes
    }));
}

function transform_format(_input: _.CollectionChain<{
    sequence: [number, number][];
    original_sequence_indexes: number[];
}>): {
    seq: number[][];
    matchedIndices: number[];
}[] {
  throw new Error(`${arguments.callee.name} not implemented`)
}

export default function solve(
  matrix: string[][],
  targets: string[][],
  totalBufferSize: number): {
    seq: number[][];
    matchedIndices: number[];
}[]
{
  const normalized_matrix =  matrix.map(x => normalize_sequence(x));
  const normalized_targets =  targets.map(x => normalize_sequence(x));
  
  const result = solve_normalized(normalized_matrix, normalized_targets, totalBufferSize);

  return transform_format(result);
}
