import { MongoClient, Db } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let _clientPromise: Promise<MongoClient> | null = null;

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  maxPoolSize: 10,
  retryWrites: true,
};

function createClient(uri: string): Promise<MongoClient> {
  return new MongoClient(uri, MONGO_OPTIONS).connect();
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not defined');

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClient(uri);
    }
    return global._mongoClientPromise;
  }

  if (!_clientPromise) {
    _clientPromise = createClient(uri);
  }
  return _clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}
