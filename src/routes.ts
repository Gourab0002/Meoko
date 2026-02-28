import { Context } from "hono";
import * as Scrapers from "./scrapers.ts";
import { Constants } from "./constants.ts";
import * as Utils from "./utils.ts";

const baseUrl = Constants.NyaaBaseUrl;

export class Handlers {
  static Ping = function (c: Context) {
    return c.text("Nyaa API v2 // Alive");
  };

  static GetInfoFromID = async function (c: Context) {
    try {
      const id = c.req.param("id");
      const searchUrl = baseUrl + "/view/" + id;

      return await Scrapers.fileInfoScraper(c, searchUrl);
    } catch (error) {
      return c.text("Not Found", 404);
    }
  };

  static GetUserUploads = async function (c: Context) {
    try {
      const username = c.req.param("username");
      const queryParams = Utils.getSearchParameters(c);

      const searchUrl = `${baseUrl}/user/${username}?q=${queryParams.query.trim()}&p=${
        queryParams.page
      }&s=${queryParams.sort}&o=${queryParams.order}&f=${queryParams.filter}`;

      return await Scrapers.scrapeNyaa(c, searchUrl);
    } catch (error) {
      return c.text("Not Found", 404);
    }
  };

  static GetCategoryTorrents = async function (c: Context) {
    try {
      const cat = c.req.param("category");
      const subCat = c.req.param("subcategory");

      const category = Utils.getCategoryID(cat, subCat);
      const queryParams = Utils.getSearchParameters(c);

      const searchUrl = `${baseUrl}?q=${queryParams.query.trim()}&c=${category}&p=${
        queryParams.page
      }&s=${queryParams.sort}&o=${queryParams.order}&f=${queryParams.filter}`;

      return await Scrapers.scrapeNyaa(c, searchUrl);
    } catch (error) {
      return c.text("Not Found", 404);
    }
  };
}
