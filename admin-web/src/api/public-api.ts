import { Tag } from "../types";
import { requestData } from "./http";

export const publicApi = {
  listTags(includeInactive = true) {
    return requestData<Tag[]>({
      method: "GET",
      url: "/api/v1/tags",
      params: { includeInactive },
    });
  },
};

