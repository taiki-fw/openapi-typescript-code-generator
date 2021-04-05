import { EOL } from "os";

import { OpenApiTools, ResolveReference, TsGenerator, Validator, FileSystem } from "./api";
import type * as Types from "./types";

export interface GeneratorTemplate<T> {
  generator: Types.CodeGenerator.GenerateFunction<T>;
  option?: T;
}

export class CodeGenerator {
  private rootSchema: Types.OpenApi.Document;
  private resolvedReferenceDocument: Types.OpenApi.Document;
  private parser: OpenApiTools.Parser;
  constructor(private readonly entryPoint: string) {
    this.rootSchema = FileSystem.loadJsonOrYaml(entryPoint);
    this.resolvedReferenceDocument = ResolveReference.resolve(entryPoint, entryPoint, JSON.parse(JSON.stringify(this.rootSchema)));
    this.parser = this.createParser();
  }

  private createParser(allowOperationIds?: string[]): OpenApiTools.Parser {
    return new OpenApiTools.Parser(this.entryPoint, this.rootSchema, this.resolvedReferenceDocument, {
      allowOperationIds: allowOperationIds,
    });
  }

  public validate(config?: Types.Validator.Configuration) {
    if (!config) {
      Validator.validate(this.resolvedReferenceDocument);
    } else {
      Validator.validate(this.resolvedReferenceDocument, config.logger);
    }
  }

  public generateTypeDefinition<T = {}>(generatorTemplate?: GeneratorTemplate<T>): string {
    const create = () => {
      const statements = this.parser.getTypeDefinitionStatements();
      if (generatorTemplate) {
        const payload = this.parser.getCodeGeneratorParamsArray();
        const extraStatements = TsGenerator.Utils.convertIntermediateCodes(generatorTemplate.generator(payload, generatorTemplate.option));
        return statements.concat(extraStatements);
      }
      return statements;
    };
    return [OpenApiTools.Comment.generateLeading(this.resolvedReferenceDocument), TsGenerator.generate(create)].join(EOL + EOL + EOL);
  }

  public generateCode<T>(generatorTemplate: GeneratorTemplate<T>): string {
    const payload = this.parser.getCodeGeneratorParamsArray();
    const create = () => TsGenerator.Utils.convertIntermediateCodes(generatorTemplate?.generator(payload, generatorTemplate.option));
    return [OpenApiTools.Comment.generateLeading(this.resolvedReferenceDocument), TsGenerator.generate(create)].join(EOL + EOL + EOL);
  }
}
