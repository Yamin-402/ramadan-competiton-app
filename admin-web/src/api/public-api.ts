import { Tag } from "../types";
import { requestData } from "./http";

export const publicApi = {
  listTags(includeInactive = true) {
    return requestData<Tag[]>({
      method: "GET",
      url: "/tags",
      params: { includeInactive },
    });
  },
};

