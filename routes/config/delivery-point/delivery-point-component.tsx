
import { useTranslations } from "use-intl";
import {
  useDeliveryPoint,
  useDeleteDeliveryPoint,
} from "@/hooks/use-delivery-point";
import type { DeliveryPoint } from "@/types/delivery-point";
import { DeliveryPointDialog } from "@/components/share/delivery-point-dialog";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useDeliveryPointTable } from "./use-delivery-point-table";
import DeliveryPointCard from "./delivery-point-card";

/**
 * Component หลักของหน้ารายการ Delivery Point ใช้ ConfigListTemplate พร้อม dialog
 * @returns React element ของหน้ารายการ Delivery Point
 * @example
 * // route: /config/delivery-point
 * <DeliveryPointComponent />
 */
export default function DeliveryPointComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<DeliveryPoint>
      translationNamespace="config.deliveryPoint"
      entityNameField="name"
      useList={useDeliveryPoint}
      useDelete={useDeleteDeliveryPoint}
      useTable={useDeliveryPointTable}
      permissionPrefix="configuration.delivery_point"
      exportColumns={[
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <DeliveryPointDialog
          open={open}
          onOpenChange={onOpenChange}
          deliveryPoint={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, index, onEdit }) => (
        <DeliveryPointCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
