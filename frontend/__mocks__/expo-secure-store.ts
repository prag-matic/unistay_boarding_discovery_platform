// Mock for expo-secure-store
const store: Record<string, string> = {};

const getItemAsync = jest.fn(async (key: string) => store[key] ?? null);
const setItemAsync = jest.fn(async (key: string, value: string) => {
  store[key] = value;
});
const deleteItemAsync = jest.fn(async (key: string) => {
  delete store[key];
});

const _reset = () => {
  Object.keys(store).forEach((k) => delete store[k]);
  getItemAsync.mockClear();
  setItemAsync.mockClear();
  deleteItemAsync.mockClear();
};

export { getItemAsync, setItemAsync, deleteItemAsync, _reset };
