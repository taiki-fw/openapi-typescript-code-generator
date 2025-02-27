import ts from "typescript";

import type { TsGenerator } from "../../../api";
import * as Utils from "../utils";

export interface Params {
  variableName: string;
  object: Utils.LiteralExpressionObject;
}

export const create = (factory: TsGenerator.Factory.Type, params: Params): ts.VariableStatement => {
  return factory.VariableStatement.create({
    declarationList: factory.VariableDeclarationList.create({
      flag: "const",
      declarations: [
        factory.VariableDeclaration.create({
          name: params.variableName,
          initializer: Utils.generateObjectLiteralExpression(factory, params.object),
        }),
      ],
    }),
  });
};
