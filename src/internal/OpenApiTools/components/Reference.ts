import { posix as path } from "path";

import type { OpenApi } from "../../../types";
import { DevelopmentError, FeatureDevelopmentError, NotFoundFileError } from "../../Exception";
import { FileSystem } from "../../FileSystem";
import * as Logger from "../../Logger";
import * as Guard from "../Guard";
import { Def } from "../Walker";

export type LocalReferencePattern =
  | "#/components/schemas/"
  | "#/components/responses/"
  | "#/components/parameters/"
  | "#/components/examples/"
  | "#/components/requestBodies/"
  | "#/components/headers/"
  | "#/components/securitySchemes/"
  | "#/components/links/"
  | "#/components/callbacks/"
  | "#/components/pathItems/";

export interface LocalReference {
  type: "local";
  /**
   * @example #/components/schemas/Hoge -> Hoge
   */
  name: string;
  /**
   * startsWith `components`
   * components/headers/hoge/fuga
   */
  path: string;
}

export interface RemoteReference<T> {
  type: "remote";
  /**
   * file path
   */
  referencePoint: string;
  /**
   * startsWith `components`
   * components/headers/hoge/fuga
   */
  path: string;
  /**
   * From filename - extension
   * @example a/b/c/Hoge.yml -> Hoge
   */
  name: string;
  /**
   * If "componentName" exists, you can create an alias for the type.
   * If it does not exist, you need to define the type directly.
   */
  componentName?: Def.ComponentName;
  data: T;
}

export type Type<T> = LocalReference | RemoteReference<T>;

const localReferencePatterns: readonly LocalReferencePattern[] = [
  "#/components/schemas/",
  "#/components/responses/",
  "#/components/parameters/",
  "#/components/examples/",
  "#/components/requestBodies/",
  "#/components/headers/",
  "#/components/securitySchemes/",
  "#/components/links/",
  "#/components/callbacks/",
  "#/components/pathItems/",
];

export const localReferenceComponents = {
  "#/components/schemas/": "components/schemas",
  "#/components/responses/": "components/responses",
  "#/components/parameters/": "components/parameters",
  "#/components/examples/": "components/examples",
  "#/components/requestBodies/": "components/requestBodies",
  "#/components/headers/": "components/headers",
  "#/components/securitySchemes/": "components/securitySchemes",
  "#/components/links/": "components/links",
  "#/components/callbacks/": "components/callbacks",
  "#/components/pathItems/": "components/pathItems",
} as const;

export const getLocalReferencePattern = (reference: OpenApi.Reference) => {
  let localReferencePattern: LocalReferencePattern | undefined;
  localReferencePatterns.forEach(referencePattern => {
    if (new RegExp("^" + referencePattern).test(reference.$ref)) {
      localReferencePattern = referencePattern;
    }
  });
  return localReferencePattern;
};

export const generateLocalReference = (reference: OpenApi.Reference): LocalReference | undefined => {
  const localReferencePattern = getLocalReferencePattern(reference);
  if (!localReferencePattern) {
    return;
  }
  const name = reference.$ref.split(localReferencePattern)[1];
  const localPath = path.posix.join(localReferenceComponents[localReferencePattern], name);
  if (!localPath.startsWith("components")) {
    throw new DevelopmentError(`localPath is not start "components":\n${localPath}`);
  }
  return {
    type: "local",
    name,
    path: localPath,
  };
};

export const generateReferencePoint = (currentPoint: string, reference: OpenApi.Reference): string => {
  const basedir = path.dirname(currentPoint);
  const ref = reference.$ref;
  const referencePoint = path.join(basedir, ref);
  return referencePoint;
};

export const generate = <T>(entryPoint: string, currentPoint: string, reference: OpenApi.Reference): Type<T> => {
  const localReference = generateLocalReference(reference);
  if (localReference) {
    return localReference;
  }

  if (reference.$ref.startsWith("http")) {
    throw new FeatureDevelopmentError("Please Pull Request ! Welcome !");
  }

  const referencePoint = generateReferencePoint(currentPoint, reference);

  if (!FileSystem.existSync(referencePoint)) {
    Logger.showFilePosition(entryPoint, currentPoint, referencePoint);
    Logger.error(JSON.stringify(reference, null, 2));
    throw new NotFoundFileError(`Not found reference point from current point. \n Path: ${referencePoint}`);
  }

  const fragmentIndex = referencePoint.indexOf("#/");
  let targetPath: string;
  if (fragmentIndex !== -1) {
    targetPath = referencePoint.substring(fragmentIndex + 2);
  } else {
    const relativePathFromEntryPoint = path.relative(path.dirname(entryPoint), referencePoint); // components/hoge/fuga.yml
    const pathArray: string[] = relativePathFromEntryPoint.split(path.sep); // ["components", "hoge", "fuga"]
    if (pathArray[0] !== "components") {
      throw new DevelopmentError(`targetPath is not start "components":\n${relativePathFromEntryPoint}`);
    }

    const ext = path.extname(relativePathFromEntryPoint); // .yml
    targetPath = pathArray.join("/").substring(0, relativePathFromEntryPoint.length - ext.length); // components/hoge/fuga
  }
  const pathArray: string[] = targetPath.split("/"); // ["components", "hoge", "fuga"]
  const schemaName = pathArray[pathArray.length - 1]; // fuga
  const componentName = pathArray[0] === "components" ? pathArray[1] : "";

  const data = FileSystem.loadJsonOrYaml(referencePoint);
  if (Guard.isReference(data)) {
    return generate<T>(entryPoint, referencePoint, data);
  }

  return {
    type: "remote",
    referencePoint,
    path: targetPath,
    name: schemaName,
    componentName: Guard.isComponentName(componentName) ? componentName : undefined,
    data,
  };
};

export const resolveRemoteReference = (
  entryPoint: string,
  currentPoint: string,
  reference: OpenApi.Reference,
): { referencePoint: string; data: any } => {
  if (reference.$ref.startsWith("#") || reference.$ref.startsWith("http")) {
    return { referencePoint: currentPoint, data: reference };
  }
  const referencePoint = generateReferencePoint(currentPoint, reference);
  if (!FileSystem.existSync(referencePoint)) {
    Logger.showFilePosition(entryPoint, currentPoint, referencePoint);
    Logger.error(JSON.stringify(reference, null, 2));
    throw new NotFoundFileError(`Not found reference point from current point. \n Path: ${referencePoint}`);
  }
  const data = FileSystem.loadJsonOrYaml(referencePoint);
  if (Guard.isReference(data)) {
    return resolveRemoteReference(entryPoint, referencePoint, data);
  }
  return {
    referencePoint,
    data,
  };
};

export const resolveLocalReference = (entryPoint: string, currentPoint: string, reference: OpenApi.Reference): any => {
  if (!reference.$ref.startsWith("#")) {
    return reference;
  }
  const referencePoint = generateReferencePoint(currentPoint, reference);
  const data = FileSystem.loadJsonOrYaml(referencePoint);
  if (Guard.isReference(data)) {
    return resolveRemoteReference(entryPoint, referencePoint, data);
  }
  return data;
};
