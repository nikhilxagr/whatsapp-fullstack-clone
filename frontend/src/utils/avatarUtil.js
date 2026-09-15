export const getAvatarUrl = (userOrUrl, fallbackName = "User") => {
  const url = typeof userOrUrl === "string" ? userOrUrl : userOrUrl?.profilePicture;
  if (
    url &&
    typeof url === "string" &&
    !url.includes("avatar.iran.liara.run") &&
    !url.includes("liara.run")
  ) {
    return url;
  }
  const name =
    (typeof userOrUrl === "object" ? userOrUrl?.username : null) ||
    (typeof userOrUrl === "string" && !userOrUrl.startsWith("http") ? userOrUrl : null) ||
    fallbackName ||
    "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00a884&color=fff&bold=true`;
};
