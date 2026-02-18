import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { catchAsync } from "../../utils/catchAsync";
import { applyFetchHeadersToExpress } from "../../utils/http";

export const AuthController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.register(req);
    applyFetchHeadersToExpress(result.headers, res);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: result.response,
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req);
    applyFetchHeadersToExpress(result.headers, res);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result.response,
    });
  }),

  me: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.me(req);

    res.status(200).json({
      success: true,
      message: "Current user retrieved successfully",
      data: result,
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.signOut(req);
    applyFetchHeadersToExpress(result.headers, res);

    res.status(200).json({
      success: true,
      message: "Logout successful",
      data: result.response,
    });
  }),

  googleLogin: catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.googleSignIn(req);
    applyFetchHeadersToExpress(result.headers, res);

    res.status(200).json({
      success: true,
      message: "Google sign-in URL generated",
      data: result.response,
    });
  }),
};
