import { NotFoundException } from "@nestjs/common";
import { ResponseContext } from "./response/response.context";
import { ResponseCodes } from "./response/codes";

export const notFoundExceptionBuilder = (context: `${ResponseContext}`) => {
  return new NotFoundException({
    code: ResponseCodes.not_found,
    context,
  });
};