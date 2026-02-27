import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";

/**
 * Validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Where to get the data from ('body', 'params', 'query')
 */
export const validate = (
  schema: ZodSchema,
  source: "body" | "params" | "query" = "body",
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and validate the data
      schema.parse(req[source]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: String(err.path.join(".")),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: "ValidationError",
          message: "Validation failed",
          errors,
        });
        return;
      }

      next(error);
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodSchema) => validate(schema, "body");

/**
 * Validate request params
 */
export const validateParams = (schema: ZodSchema) => validate(schema, "params");

/**
 * Validate request query
 */
export const validateQuery = (schema: ZodSchema) => validate(schema, "query");
