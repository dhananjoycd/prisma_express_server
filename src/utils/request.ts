import { AppError } from "./AppError";

export const getRequiredParam = (
  value: string | string[] | undefined,
  name: string,
): string => {
  if (typeof value !== "string") {
    throw new AppError(`${name} is required`, 400);
  }

  return value;
};
