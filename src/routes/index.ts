import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { CartRoutes } from "../modules/cart/cart.routes";
import { CategoryRoutes } from "../modules/category/category.routes";
import { MealRoutes } from "../modules/meal/meal.routes";
import { OrderRoutes } from "../modules/order/order.routes";
import { ProviderRoutes } from "../modules/provider/provider.routes";
import { ReviewRoutes } from "../modules/review/review.routes";
import { UserRoutes } from "../modules/user/user.routes";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/users", UserRoutes);
router.use("/categories", CategoryRoutes);
router.use("/meals", MealRoutes);
router.use("/providers", ProviderRoutes);
router.use("/cart", CartRoutes);
router.use("/orders", OrderRoutes);
router.use("/reviews", ReviewRoutes);

export default router;
