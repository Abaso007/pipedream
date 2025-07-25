export const parseObject = (obj) => {
  if (!obj) return undefined;

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === "string") {
        try {
          return JSON.parse(item);
        } catch (e) {
          return item;
        }
      }
      return item;
    });
  }
  if (typeof obj === "string") {
    try {
      return JSON.parse(obj);
    } catch (e) {
      return obj;
    }
  }
  return obj;
};

export const parseCustomFields = (customFields) => {
  const parsedCustomFields = Object.entries(parseObject(customFields) || {});
  if (parsedCustomFields.length) {
    return parsedCustomFields.map(([
      key,
      value,
    ]) => ({
      label: key,
      value,
    }));
  }
};
