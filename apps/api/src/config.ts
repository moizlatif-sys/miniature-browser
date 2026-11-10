export const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/miniature-browser';

export const mongoUri = () => process.env.MONGODB_URI ?? DEFAULT_MONGODB_URI;
