import {bench, describe} from 'vitest';
import {CASES, BUFFER_SIZES} from './bench.data';
import * as _ from 'lodash';

import stitch_dfs from '../solvers/stitch-dfs';
import {originalSolve as old_solver} from '../test/original-solver';
import {solve as new_solver} from '../solver';

const solver_cases = _({old_solver, new_solver, stitch_dfs})
  .flatMapDeep((solver, name) => 
    CASES.map(({matrix, targets}, case_number) =>
      BUFFER_SIZES.map(buffer_size => {
        const cloned_matrix = _.cloneDeep(matrix) as unknown as string[][];
        const cloned_targets = _.cloneDeep(targets) as unknown as string[][];
        const result: [string, () => void] = [
          `${name}# case ${case_number} (Buffer: ${buffer_size})`,
          () => {solver(cloned_matrix, cloned_targets, buffer_size);}
        ];
        return result;
      })
    )
  )
  .value()

export default describe(
  "Breach Protocol Solvers", () => {
  solver_cases.forEach(([name, fn]) => bench(name, fn))
})
