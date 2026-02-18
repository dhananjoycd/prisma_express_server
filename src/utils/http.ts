import { Request, Response } from "express";

const APPEND_ONLY_RESPONSE_HEADERS = new Set(["set-cookie"]);

export const toFetchHeaders = (req: Request) => {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  return headers;
};

export const applyFetchHeadersToExpress = (headers: Headers, res: Response) => {
  headers.forEach((value, key) => {
    if (APPEND_ONLY_RESPONSE_HEADERS.has(key.toLowerCase())) {
      res.append(key, value);
      return;
    }

    res.setHeader(key, value);
  });
};
