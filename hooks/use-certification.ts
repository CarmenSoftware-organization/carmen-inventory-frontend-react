import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  Certification,
  CreateCertificationDto,
} from "@/types/certification";

const crud = createConfigCrud<Certification, CreateCertificationDto>({
  queryKey: QUERY_KEYS.CERTIFICATIONS,
  endpoint: API_ENDPOINTS.VENDOR_MASTER_CERTIFICATES,
  label: "certification",
  updateMethod: "PATCH",
});

export const useCertification = crud.useList;
export const useCreateCertification = crud.useCreate;
export const useUpdateCertification = crud.useUpdate;
export const useDeleteCertification = crud.useDelete;
