import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { ProviderService } from "./provider.service";

export const ProviderController = {
  getProviders: catchAsync(async (req: Request, res: Response) => {
    const filters: { search?: string; cuisine?: string } = {};

    if (typeof req.query.search === "string") {
      filters.search = req.query.search;
    }

    if (typeof req.query.cuisine === "string") {
      filters.cuisine = req.query.cuisine;
    }

    const result = await ProviderService.getProviders(filters);

    res.status(200).json({
      success: true,
      message: "Providers retrieved successfully",
      data: result,
    });
  }),

  getProviderById: catchAsync(async (req: Request, res: Response) => {
    const id = getRequiredParam(req.params.id, "Provider id");
    const result = await ProviderService.getProviderById(id);

    res.status(200).json({
      success: true,
      message: "Provider retrieved successfully",
      data: result,
    });
  }),
};
