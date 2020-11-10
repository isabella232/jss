import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

/*
  COMPONENT FACTORY GENERATION
  Generates the /src/temp/componentFactory.ts file which maps React components
  to JSS components.

  The component factory is a mapping between a string name and a React component instance.
  When the Sitecore Layout service returns a layout definition, it returns named components.
  This mapping is used to construct the component hierarchy for the layout.

  The default convention uses the parent folder name as the component name,
  but it is customizable in generateComponentFactory().

  NOTE: this script can run in two modes. The default mode, the component factory file is written once.
  But if `--watch` is a process argument, the component factory source folder will be watched,
  and the componentFactory.ts rewritten on added or deleted files.
  This is used during `jss start` to pick up new or removed components at runtime.
*/

/* eslint-disable no-console */

const componentFactoryPath = path.resolve('src/temp/componentFactory.ts');
const componentRootPath = 'src/components';

const isWatch = process.argv.some((arg) => arg === '--watch');

if (isWatch) {
  watchComponentFactory();
} else {
  writeComponentFactory();
}

function watchComponentFactory() {
  console.log(`Watching for changes to component factory sources in ${componentRootPath}...`);

  chokidar
    .watch(componentRootPath, { ignoreInitial: true, awaitWriteFinish: true })
    .on('add', writeComponentFactory)
    .on('unlink', writeComponentFactory);
}

function writeComponentFactory() {
  const componentFactory = generateComponentFactory();

  console.log(`Writing component factory to ${componentFactoryPath}`);

  fs.writeFileSync(componentFactoryPath, componentFactory, {
    encoding: 'utf8',
  });
}

function generateComponentFactory() {
  // by convention, we expect to find React components
  // * under /components/ComponentName
  // * with an index.ts under the folder to define the component
  // If you'd like to use your own convention, encode it below.
  // NOTE: generating the component factory is also totally optional,
  // and it can be maintained manually if preferred.

  const imports: string[] = [];
  const registrations: string[] = [];

  fs.readdirSync(componentRootPath).forEach((componentFolder) => {
    const componentFolderFullPath = path.join(componentRootPath, componentFolder);

    if (
      fs.existsSync(path.join(componentFolderFullPath, 'index.ts')) ||
      fs.existsSync(path.join(componentFolderFullPath, 'index.tsx'))
    ) {
      const importVarName = componentFolder.replace(/[^\w]+/g, '');

      console.debug(`Registering JSS component ${componentFolder}`);
      imports.push(`import ${importVarName} from '../components/${componentFolder}';`);
      registrations.push(`components.set('${componentFolder}', ${importVarName});`);
    }
  });

  return `/* eslint-disable */
// Do not edit this file, it is auto-generated at build time!
// See scripts/generate-component-factory.ts to modify the generation of this file.
${imports.join('\n')}

const components = new Map();
${registrations.join('\n')}

export default function componentFactory(componentName: string) {
  return components.get(componentName);
};
`;
}
