import { Router } from "express";
import { TagModel } from "../models/VidaData.js";

const router = Router();

// Lists the centrally managed tags available to activity creation forms.
router.get("/", async (_req, res, next) => {
  try {
    const tags = await TagModel.find()
      .select("name imageUrl")
      .sort({ name: 1 })
      .lean();

    res.json(
      tags.map((tag) => ({
        id: String(tag._id),
        name: tag.name,
        imageUrl: tag.imageUrl ?? "",
      })),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
