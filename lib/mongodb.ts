import { MongoClient, Db } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let _clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_URL is not defined');

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  if (!_clientPromise) {
    _clientPromise = new MongoClient(uri).connect();
  }
  return _clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}
