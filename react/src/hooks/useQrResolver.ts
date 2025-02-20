import { useCallback, useState } from "react";
import { FetchPolicy, useApolloClient } from "@apollo/client";
import { GET_BOX_LABEL_IDENTIFIER_BY_QR_CODE } from "queries/queries";
import { BOX_SCANNED_ON_FRAGMENT } from "queries/local-only";
import {
  GetBoxLabelIdentifierForQrCodeQuery,
  GetBoxLabelIdentifierForQrCodeQueryVariables,
} from "types/generated/graphql";

// eslint-disable-next-line no-shadow
export enum IQrResolverResultKind {
  SUCCESS = "success",
  FAIL = "fail",
  NOT_ASSIGNED_TO_BOX = "notAssignedToBox",
  NOT_FOUND = "notFound",
  NOT_AUTHORIZED = "notAuthorized",
  NOT_BOXTRIBUTE_QR = "noBoxtributeQr",
  // TODO: implement the following two edge cases
  DELETED_BOX = "deletedBox",
  LEGACY_BOX = "legacyBox",
}

export interface IQrResolvedValue {
  kind: IQrResolverResultKind;
  qrHash?: string;
  box?: any;
  error?: any;
}

export const extractQrCodeFromUrl = (url): string | undefined => {
  // TODO: improve the accuracy of this regex
  // TODO: consider to also handle different boxtribute environment urls
  const rx = /.*barcode=(.*)/g;
  const arr = rx.exec(url);
  // make sure there is no space arround qr code
  return arr?.[1].trim();
};

export const useQrResolver = () => {
  const [loading, setLoading] = useState(false);
  const apolloClient = useApolloClient();

  const resolveQrHash = useCallback(
    async (hash: string, fetchPolicy: FetchPolicy): Promise<IQrResolvedValue> => {
      setLoading(true);
      const qrResolvedValue: IQrResolvedValue = await apolloClient
        .query<GetBoxLabelIdentifierForQrCodeQuery, GetBoxLabelIdentifierForQrCodeQueryVariables>({
          query: GET_BOX_LABEL_IDENTIFIER_BY_QR_CODE,
          variables: { qrCode: hash },
          fetchPolicy,
        })
        .then(({ data, errors }) => {
          if ((errors?.length || 0) > 0) {
            const errorCode = errors ? errors[0].extensions.code : undefined;
            if (errorCode === "FORBIDDEN") {
              return {
                kind: IQrResolverResultKind.NOT_AUTHORIZED,
                qrHash: hash,
              } as IQrResolvedValue;
            }
            if (errorCode === "BAD_USER_INPUT") {
              return {
                kind: IQrResolverResultKind.NOT_FOUND,
                qrHash: hash,
              } as IQrResolvedValue;
            }
            return {
              kind: IQrResolverResultKind.FAIL,
              qrHash: hash,
            } as IQrResolvedValue;
          }
          if (!data?.qrCode?.box) {
            return {
              kind: IQrResolverResultKind.NOT_ASSIGNED_TO_BOX,
              qrHash: hash,
            } as IQrResolvedValue;
          }
          return {
            kind: IQrResolverResultKind.SUCCESS,
            qrHash: hash,
            box: data?.qrCode?.box,
          } as IQrResolvedValue;
        })
        .catch(
          (err) =>
            ({
              kind: IQrResolverResultKind.FAIL,
              qrHash: hash,
              error: err,
            } as IQrResolvedValue),
        );

      if (qrResolvedValue.kind === IQrResolverResultKind.SUCCESS) {
        const boxCacheRef = `Box:{"labelIdentifier":"${qrResolvedValue.box.labelIdentifier}"}`;
        // add a scannedOn parameter in the cache if Box was scanned
        await apolloClient.writeFragment({
          id: boxCacheRef,
          fragment: BOX_SCANNED_ON_FRAGMENT,
          data: {
            scannedOn: new Date(),
          },
        });
      }
      setLoading(false);
      return qrResolvedValue;
    },
    [apolloClient],
  );

  const resolveQrCode = useCallback(
    async (qrCodeUrl: string, fetchPolicy: FetchPolicy): Promise<IQrResolvedValue> => {
      setLoading(true);
      const extractedQrHashFromUrl = extractQrCodeFromUrl(qrCodeUrl);
      if (extractedQrHashFromUrl == null) {
        setLoading(false);
        return { kind: IQrResolverResultKind.NOT_BOXTRIBUTE_QR } as IQrResolvedValue;
      }
      const qrResolvedValue: IQrResolvedValue = await resolveQrHash(
        extractedQrHashFromUrl,
        fetchPolicy,
      );
      setLoading(false);
      return qrResolvedValue;
    },
    [resolveQrHash],
  );

  return {
    loading,
    resolveQrHash,
    resolveQrCode,
  };
};
