import * as Path from 'path';

import {Context, command, metadata, option} from 'clime';
import glob from 'glob';
import _ from 'lodash';
import * as v from 'villa';

import {Target} from '../@core';
import {loadConfig} from '../@utils';

export class TSProjectOptions extends Target.CommandOptions {
  @option({
    toggle: true,
    description: 'include composite projects (`extends` is not handled)',
  })
  includeComposite!: boolean;

  @option({
    toggle: true,
    description: 'match only composite projects (`extends` is not handled)',
  })
  onlyComposite!: boolean;
}

@command({
  description: 'Run in every TypeScript project',
  skippedArgs: true,
})
export default class extends Target.Command {
  @metadata
  execute(options: TSProjectOptions, context: Context): Promise<void> {
    return this.runInEvery(options, context);
  }

  protected async scan(options: TSProjectOptions): Promise<Target.Target[]> {
    let configFilePaths = await v.call(
      glob,
      '**/{tsconfig.json,tsconfig.*.json}',
      {
        ignore: ['**/node_modules/**'],
        nodir: true,
      },
    );

    let toIncludeComposite = options.includeComposite || options.onlyComposite;
    let toIncludeNonComposite = !options.onlyComposite;

    if (!toIncludeComposite || !toIncludeNonComposite) {
      configFilePaths = await v.filter(configFilePaths, async path => {
        let config = await loadConfig<any>(path);

        let composite = config?.compilerOptions?.composite === true;

        return composite ? toIncludeComposite : toIncludeNonComposite;
      });
    }

    let configFileEntries = configFilePaths.map(path => {
      return {
        path,
        dir: Path.dirname(path),
        variables: {
          configFileName: Path.basename(path),
        },
      };
    });

    return _.uniqBy(configFileEntries, entry => entry.dir).map(entry => {
      return new Target.Target(entry.dir, entry.dir, entry.variables);
    });
  }
}
