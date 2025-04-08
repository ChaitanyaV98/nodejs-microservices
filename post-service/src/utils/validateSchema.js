import Joi from "joi";

export const validateCreatePost = (data) => {
  const schema = Joi.object({
    content: Joi.string().min(3).max(6000).required(),
  });
  return schema.validate(data);
};
