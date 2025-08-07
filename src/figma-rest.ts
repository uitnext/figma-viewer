import * as figma from "./figma";

interface RequestInit<T = object> {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body: T;
}

interface FigmaRestOptions {
  accessToken: string;
}

export class FigmaRest {
  #baseUrl: string;
  #options: FigmaRestOptions;
  constructor(baseUrl: string, options: FigmaRestOptions) {
    this.#baseUrl = baseUrl;
    this.#options = options;
  }
  request(uri: string, requestInit?: RequestInit) {
    return fetch(this.#getUrl(uri), {
      method: requestInit?.method || "GET",
      ...(requestInit?.method !== "GET" &&
        requestInit?.body && {
          body: JSON.stringify(requestInit.body),
        }),
      headers: {
        "X-Figma-Token": this.#options.accessToken,
      },
    }).then((res) => res.json());
  }

  async getFigmaSpec(fileKey: string, nodeId: string) {
    const res = await this.request(`/v1/files/${fileKey}/nodes?ids=${nodeId}`);
    return res.nodes[nodeId].document as figma.Node;
  }

  async getFigmaImage(
    fileKey: string,
    nodeId: string,
    format = "svg"
  ): Promise<string> {
    const res = await this.request(
      `/v1/images/${fileKey}?ids=${nodeId}&format=${format}`
    );
    return res.images[nodeId];
  }

  #getUrl(uri: string) {
    return this.#baseUrl + uri;
  }
}
