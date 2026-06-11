import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";

export interface DbObject {
  schema: string;
  name: string;
  kind?: string;
}

export interface DbColumn {
  table: string;
  column: string;
  data_type: string;
}

export interface DbObjectsResponse {
  tables: DbObject[];
  views: DbObject[];
  procedures: DbObject[];
  columns: DbColumn[];
}

export interface DbObjectDefinition {
  type: string;
  schema: string;
  name: string;
  definition: string;
}

export interface SqlExecuteResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

export interface SaveDdlInput {
  name?: string;
  sql_text: string;
  query_type: "view" | "stored_procedure" | "function";
}

export interface SaveDdlResult {
  type: string;
  name: string;
  schema: string;
  executed_sql: string;
}

const DB_OBJECTS_KEY = "sql-db-objects";

export function useDbObjects() {
  const buCode = useBuCode();
  return useQuery<DbObjectsResponse>({
    queryKey: [DB_OBJECTS_KEY, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.SQL_QUERY_DB_OBJECTS(buCode!));
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch DB objects");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode,
  });
}

export function useDbObjectDefinition() {
  const buCode = useBuCode();
  return useMutation<
    DbObjectDefinition,
    ApiError,
    { type: string; schema: string; name: string }
  >({
    mutationFn: async ({ type, schema, name }) => {
      const res = await httpClient.get(
        API_ENDPOINTS.SQL_QUERY_DB_OBJECT_DEFINITION(buCode!, type, schema, name),
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch object definition");
      const json = await res.json();
      return json.data as DbObjectDefinition;
    },
  });
}

export function useSqlQueryExecute() {
  const buCode = useBuCode();
  return useMutation<SqlExecuteResult, ApiError, string>({
    mutationFn: async (sql_text: string) => {
      const res = await httpClient.post(
        API_ENDPOINTS.SQL_QUERY_EXECUTE(buCode!),
        { sql_text },
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to execute SQL");
      const json = await res.json();
      return json.data as SqlExecuteResult;
    },
  });
}

export function useSqlQuerySave() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  return useMutation<SaveDdlResult, ApiError, SaveDdlInput>({
    mutationFn: async (input) => {
      const res = await httpClient.post(API_ENDPOINTS.SQL_QUERY_SAVE(buCode!), input);
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to save DDL");
      const json = await res.json();
      return json.data as SaveDdlResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DB_OBJECTS_KEY, buCode] });
    },
  });
}

export function useSqlQueryDrop() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  return useMutation<
    { dropped: boolean; type: string; schema: string; name: string },
    ApiError,
    { type: string; schema: string; name: string }
  >({
    mutationFn: async ({ type, schema, name }) => {
      const res = await httpClient.delete(
        API_ENDPOINTS.SQL_QUERY_DROP(buCode!, type, schema, name),
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to drop object");
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DB_OBJECTS_KEY, buCode] });
    },
  });
}
