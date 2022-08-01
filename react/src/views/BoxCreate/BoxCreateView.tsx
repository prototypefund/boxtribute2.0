import { gql, useMutation, useQuery } from "@apollo/client";
import APILoadingIndicator from "components/APILoadingIndicator";
import { useNavigate, useParams } from "react-router-dom";
import {
  AllProductsQuery,
  AllProductsQueryVariables,
  CreateBoxMutation,
  CreateBoxMutationVariables,
} from "types/generated/graphql";
import BoxCreate, { BoxFormValues } from "./components/BoxCreate";

export const ALL_PRODUCTS_QUERY = gql`
  query AllProducts {
    products(paginationInput: { first: 500 }) {
      elements {
        id
        name
        gender
        category {
          name
        }
        sizeRange {
          label
        }
      }
    }
  }
`;

export const CREATE_BOX_MUTATION = gql`
  mutation CreateBox(
    $locationId: Int!
    $productId: Int!
    $sizeId: Int!
    $numberOfItems: Int!
    $qrCode: String
  ) {
    createBox(
      creationInput: {
        locationId: $locationId
        productId: $productId
        items: $numberOfItems
        sizeId: $sizeId
        qrCode: $qrCode
      }
    ) {
      labelIdentifier
    }
  }
`;

const BoxCreateView = () => {
  const labelIdentifier = useParams<{ labelIdentifier: string }>()
    .labelIdentifier!;
  const { loading, data } = useQuery<
    AllProductsQuery,
    AllProductsQueryVariables
  >(ALL_PRODUCTS_QUERY, {
  });
  const baseId = useParams<{ baseId: string }>().baseId;
  const navigate = useNavigate();

  const [updateContentOfBoxMutation] = useMutation<CreateBoxMutation, CreateBoxMutationVariables>(CREATE_BOX_MUTATION);

  const onSubmitBoxCreateForm = (boxFormValues: BoxFormValues) => {
    console.log("boxLabelIdentifier", labelIdentifier);
    console.log("boxFormValues", boxFormValues);

    updateContentOfBoxMutation({
      variables: {
        locationId: parseInt(boxFormValues.locationId),
        sizeId: parseInt(boxFormValues.sizeId),
        productId: parseInt(boxFormValues.productForDropdown.value),
        numberOfItems: boxFormValues.numberOfItems,
      },
    })
      .then((mutationResult) => {
        navigate(
          `/bases/${baseId}/boxes/${mutationResult.data?.createBox?.labelIdentifier}`
        );
      })
      .catch((error) => {
        console.log("Error while trying to update Box", error);
      });
  };

  if (loading) {
    return <APILoadingIndicator />;
  }
  const allProducts = data?.products;

  if (allProducts?.elements == null) {
    console.error("allProducts.elements is null");
    return <div>Error: no products available to choose from for this Box</div>;
  }

  return (
    <BoxCreate
      allProducts={allProducts?.elements}
      onSubmitBoxCreateForm={onSubmitBoxCreateForm}
    />
  );
};

export default BoxCreateView;
