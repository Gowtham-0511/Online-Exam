import sql from 'mssql';

// const config: sql.config = {
//   user: "SysRankUser",
//   password: "SysR@nk123",
//   server: "SSIC-SQL-01",
//   database: "SysRank",
//   options: {
//     encrypt: true,
//     trustServerCertificate: true,
//   },
// };


const config: sql.config = {
  user: "SysPortalAdmin",
  password: "spa@Systech2o23",
  server: "sysportaldbs.database.windows.net",
  database: "SysRankDB",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getDBConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}
