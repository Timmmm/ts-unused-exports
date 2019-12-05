import { dirname, join, relative, resolve, sep } from 'path';
import { existsSync } from 'fs';
import * as tsconfigPaths from 'tsconfig-paths';
import * as ts from 'typescript';

import { getFrom, FromWhat, STAR } from './common';
import { Imports } from '../types';

// Parse Imports

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

const relativeTo = (rootDir: string, file: string, path: string): string =>
  relative(rootDir, resolve(dirname(file), path));

const isRelativeToBaseDir = (baseDir: string, from: string): boolean =>
  existsSync(resolve(baseDir, `${from}.js`)) ||
  existsSync(resolve(baseDir, `${from}.ts`)) ||
  existsSync(resolve(baseDir, `${from}.tsx`)) ||
  existsSync(resolve(baseDir, from, 'index.js')) ||
  existsSync(resolve(baseDir, from, 'index.ts')) ||
  existsSync(resolve(baseDir, from, 'index.tsx'));

export const extractImport = (decl: ts.ImportDeclaration): FromWhat => {
  const from = getFrom(decl.moduleSpecifier);
  const { importClause } = decl;
  if (!importClause)
    return {
      from,
      what: STAR,
    };

  const { namedBindings } = importClause;
  const importDefault = !!importClause.name ? ['default'] : [];

  if (!namedBindings) {
    return {
      from,
      what: importDefault,
    };
  }

  const isStar = !!(namedBindings as ts.NamespaceImport).name;

  const importNames = isStar
    ? STAR
    : (namedBindings as ts.NamedImports).elements.map(
        e => (e.propertyName || e.name).text,
      );

  // TODO xxx if importNames has namespaces, then need to scan for use of 'x.y' -> addImport('x.y')
  // need to remember that From (file) has exported namespace 'x'?
  // so return 2nd value: importedNamespaces: FromWhat
  // then file needs to be scanned for *uses* from that namespace (not imports!)

  return {
    from,
    what: importDefault.concat(importNames),
  };
};

export const addImportCore = (
  fw: FromWhat,
  rootDir: string,
  path: string,
  imports: Imports,
  baseDir: string,
  baseUrl: string,
  tsconfigPathsMatcher?: tsconfigPaths.MatchPath,
): string | undefined => {
  const { from, what } = fw;

  const getKey = (from: string): string | undefined => {
    if (from[0] == '.') {
      // An undefined return indicates the import is from 'index.ts' or similar == '.'
      return relativeTo(rootDir, path, from) || '.';
    } else {
      let matchedPath;

      return isRelativeToBaseDir(baseDir, from)
        ? join(baseUrl, from)
        : tsconfigPathsMatcher &&
          (matchedPath = tsconfigPathsMatcher(
            from,
            undefined,
            undefined,
            EXTENSIONS,
          ))
        ? matchedPath.replace(`${baseDir}${sep}`, '')
        : undefined;
    }
  };

  const key = getKey(from);
  if (!key) return undefined;
  const items = imports[key] || [];
  imports[key] = items.concat(what);
  return key;
};
