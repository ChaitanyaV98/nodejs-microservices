import logger from "../utils/logger.js";
import Search from "../models/Search.js";

export const searchPostController = async (req, res) => {
  logger.info("Seach endpoint hit");
  try {
    const { query } = req.query;
    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
    return res.json({
      searchResults: results,
    });
  } catch (e) {
    logger.error("Error while searching post", e);

    res.status(500).json({
      success: false,
      message: "Error while searching  post",
    });
  }
};
