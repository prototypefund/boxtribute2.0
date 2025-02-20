import { useCallback, useState, useContext } from "react";
import { useApolloClient } from "@apollo/client";
import { useNotification } from "hooks/useNotification";
import { useNavigate } from "react-router-dom";
import { GlobalPreferencesContext } from "providers/GlobalPreferencesProvider";
import { useErrorHandling } from "hooks/useErrorHandling";
import {
  ILabelIdentifierResolvedValue,
  ILabelIdentifierResolverResultKind,
  useLabelIdentifierResolver,
} from "hooks/useLabelIdentifierResolver";
import { IQrResolvedValue, IQrResolverResultKind, useQrResolver } from "hooks/useQrResolver";
import { GET_SCANNED_BOXES } from "queries/local-only";
import QrReader from "./components/QrReader";

interface IQrReaderContainerProps {
  onSuccess: () => void;
}

function QrReaderContainer({ onSuccess }: IQrReaderContainerProps) {
  const apolloClient = useApolloClient();
  const { globalPreferences } = useContext(GlobalPreferencesContext);
  const baseId = globalPreferences.selectedBaseId;
  const navigate = useNavigate();
  const { createToast } = useNotification();
  const { triggerError } = useErrorHandling();
  const { resolveQrCode } = useQrResolver();
  const { loading: findByBoxLabelIsLoading, checkLabelIdentifier } = useLabelIdentifierResolver();
  const [isMultiBox, setIsMultiBox] = useState(false);
  const [isProcessingQrCode, setIsProcessingQrCode] = useState(false);
  const setIsProcessingQrCodeDelayed = useCallback(
    (state: boolean) => {
      setTimeout(() => {
        setIsProcessingQrCode(state);
      }, 1000);
    },
    [setIsProcessingQrCode],
  );

  // handle a scan depending on if the solo box or multi box tab is active
  const onScan = async (qrReaderResultText: string, multiScan: boolean) => {
    if (!isProcessingQrCode) {
      setIsProcessingQrCode(true);
      const qrResolvedValue: IQrResolvedValue = await resolveQrCode(
        qrReaderResultText,
        multiScan ? "cache-first" : "network-only",
      );
      switch (qrResolvedValue.kind) {
        case IQrResolverResultKind.SUCCESS: {
          const boxLabelIdentifier = qrResolvedValue.box.labelIdentifier;
          if (!multiScan) {
            const boxBaseId = qrResolvedValue.box.location.base.id;
            setIsProcessingQrCode(false);
            onSuccess();
            navigate(`/bases/${boxBaseId}/boxes/${boxLabelIdentifier}`);
          } else {
            // Only execute for Multi Box tab
            // add box reference to query for list of all scanned boxes
            await apolloClient.cache.updateQuery(
              {
                query: GET_SCANNED_BOXES,
              },
              (data) => {
                const existingBoxRefs = data.scannedBoxes.map((box) => ({
                  __typename: "Box",
                  labelIdentifier: box.labelIdentifier,
                }));

                const alreadyExists = existingBoxRefs.some(
                  (ref) => ref.labelIdentifier === qrResolvedValue.box.labelIdentifier,
                );

                if (alreadyExists) {
                  createToast({
                    message: `Box ${boxLabelIdentifier} is already on the list.`,
                    type: "info",
                  });

                  return existingBoxRefs;
                }
                // execute rest only if Box is not in the scannedBoxes already
                createToast({
                  message: `Box ${boxLabelIdentifier} was added to the list.`,
                  type: "success",
                });

                return {
                  scannedBoxes: [
                    ...existingBoxRefs,
                    {
                      __typename: "Box",
                      labelIdentifier: qrResolvedValue.box.labelIdentifier,
                      state: qrResolvedValue.box.labelIdentifier,
                    },
                  ],
                };
              },
            );
            setIsProcessingQrCode(false);
          }
          break;
        }
        case IQrResolverResultKind.NOT_ASSIGNED_TO_BOX: {
          if (!multiScan) {
            onSuccess();
            navigate(`/bases/${baseId}/boxes/create/${qrResolvedValue?.qrHash}`);
          } else {
            triggerError({
              message: "No box associated to this QR-Code!",
            });
            setIsProcessingQrCodeDelayed(false);
          }
          break;
        }
        case IQrResolverResultKind.NOT_AUTHORIZED: {
          triggerError({
            message: "You don't have permission to access this box!",
          });
          setIsProcessingQrCodeDelayed(false);
          break;
        }
        case IQrResolverResultKind.NOT_FOUND: {
          triggerError({
            message: "No box found for this QR-Code!",
          });
          setIsProcessingQrCodeDelayed(false);
          break;
        }
        case IQrResolverResultKind.NOT_BOXTRIBUTE_QR: {
          triggerError({
            message: "This is not a Boxtribute QR-Code!",
          });
          setIsProcessingQrCodeDelayed(false);
          break;
        }
        case IQrResolverResultKind.FAIL: {
          triggerError({
            message: "The search for this QR-Code failed. Please try again.",
          });
          setIsProcessingQrCodeDelayed(false);
          break;
        }
        default: {
          triggerError({
            message: `The resolved value of the qr-code does not match
              any case of the IQrResolverResultKind.`,
            userMessage: "Something went wrong!",
          });
          setIsProcessingQrCodeDelayed(false);
        }
      }
    }
  };

  // handle the search by label identifier in the solo box tab
  const onFindBoxByLabel = useCallback(
    async (labelIdentifier: string) => {
      const labelIdentifierResolvedValue: ILabelIdentifierResolvedValue =
        await checkLabelIdentifier(labelIdentifier);
      switch (labelIdentifierResolvedValue.kind) {
        case ILabelIdentifierResolverResultKind.SUCCESS: {
          const boxLabelIdentifier = labelIdentifierResolvedValue?.box.labelIdentifier;
          const boxBaseId = labelIdentifierResolvedValue?.box.location.base.id;
          onSuccess();
          navigate(`/bases/${boxBaseId}/boxes/${boxLabelIdentifier}`);
          break;
        }
        case ILabelIdentifierResolverResultKind.NOT_AUTHORIZED: {
          triggerError({
            message: "You don't have permission to access this box!",
          });
          break;
        }
        case ILabelIdentifierResolverResultKind.NOT_FOUND: {
          triggerError({
            message: "A box with this label number doesn't exist!",
          });
          break;
        }
        case ILabelIdentifierResolverResultKind.FAIL: {
          triggerError({
            message: "The search for this label failed. Please try again.",
            statusCode: labelIdentifierResolvedValue?.error.code,
          });
          break;
        }
        default: {
          triggerError({
            message: `The resolved value of the qr-code does not match
            any case of the ILabelIdentifierResolverResultKind.`,
            userMessage: "Something went wrong!",
          });
        }
      }
    },
    [checkLabelIdentifier, navigate, triggerError, onSuccess],
  );

  return (
    <QrReader
      isMultiBox={isMultiBox}
      onTabSwitch={(index) => setIsMultiBox(index === 1)}
      onScan={onScan}
      onFindBoxByLabel={onFindBoxByLabel}
      findBoxByLabelIsLoading={findByBoxLabelIsLoading || isProcessingQrCode}
    />
  );
}

export default QrReaderContainer;
