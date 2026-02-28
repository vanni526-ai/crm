export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// 登录页使用内部路由，不再跳转 Manus OAuth
export const getLoginUrl = () => {
  return "/login";
};
