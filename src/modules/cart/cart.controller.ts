import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { getRequiredParam } from "../../utils/request";
import { CartService } from "./cart.service";
import { addToCartSchema, updateCartItemSchema } from "./cart.validation";

export const CartController = {
  getCart: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const result = await CartService.getCart(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Cart retrieved successfully",
      data: result,
    });
  }),

  addToCart: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const payload = addToCartSchema.parse(req.body);
    const result = await CartService.addToCart(req.user.userId, payload);

    res.status(201).json({
      success: true,
      message: "Item added to cart",
      data: result,
    });
  }),

  updateCartItem: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const id = getRequiredParam(req.params.id, "Cart item id");

    const { quantity } = updateCartItemSchema.parse(req.body);
    const result = await CartService.updateCartItem(req.user.userId, id, quantity);

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      data: result,
    });
  }),

  removeCartItem: catchAsync(async (req: Request, res: Response) => {
    if (!req.user) throw new AppError("Unauthorized", 401);

    const id = getRequiredParam(req.params.id, "Cart item id");

    await CartService.removeCartItem(req.user.userId, id);

    res.status(200).json({
      success: true,
      message: "Cart item removed",
    });
  }),
};
