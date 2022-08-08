import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { CloseIcon, EditIcon } from "@chakra-ui/icons";
import { IPackingListEntry } from "views/Distributions/types";
import _ from "lodash";



interface IPackingListEntrieGroupForProduct {
  productId: string;
  productName: string;
  packingListEntries: IPackingListEntry[]
}

const PackingListEntrieGroupForProduct = ({data}: {data: IPackingListEntrieGroupForProduct}) => {
  const {productId, productName, packingListEntries} = data;
  return (
    <Box>
      <Heading as="h3" size="sm">{productName}</Heading>
      <SimpleGrid columns={2} spacing={2}>
        {packingListEntries.map((entry) => (
          <Box key={entry.id}>

            <Text>{entry.numberOfItems}</Text>
            <Text>{entry.size?.label}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}



interface DistroEventDetailsForPlanningStateProps {
  packingListEntries: IPackingListEntry[];
  onAddItemsClick: () => void;
  onCopyPackingListFromPreviousEventsClick: () => void;
  onEditItemOnPackingListClick: (packlistItemId: string) => void;
  onRemoveItemFromPackingListClick: (packlistItemId: string) => void;
}

const DistroEventDetailsForPlanningState = ({
  packingListEntries,
  onAddItemsClick,
  onCopyPackingListFromPreviousEventsClick,
  onRemoveItemFromPackingListClick,
  onEditItemOnPackingListClick,
}: DistroEventDetailsForPlanningStateProps) => {

  // const packingListEntriesGroupedByProduct = _.groupBy(packingListEntries, (entry) => ({productId: entry.product.id, productName: entry.product.name}));
  const packingListEntriesGroupedByProductId = _.groupBy(packingListEntries, (entry) => entry.product.id);
  const packingListEntriesGroupedByProductIdAndName = Object.keys(packingListEntriesGroupedByProductId)
  .map(k => ({
    productId: k,
    productName: packingListEntriesGroupedByProductId[k]?.[0]?.product?.name,
    packingListEntries: packingListEntriesGroupedByProductId[k]
  }));

  // console.log(packingListEntriesGroupedByProductIdAndName);

  // FOO[0].

  return (
    <>
    {/* packingListEntriesGroupedByProductIdAndName: {JSON.stringify(packingListEntriesGroupedByProductIdAndName)} */}
      <Flex w={[300, 400, 600]} direction="column" mb={4}>
        <Button onClick={() => onCopyPackingListFromPreviousEventsClick()}>
          Copy Packing List from Previous Event
        </Button>
        <Button my={2} onClick={() => onAddItemsClick()} colorScheme="blue">
          Add New Packing List Entry
        </Button>
      </Flex>
      <Heading size={"md"}>
        Packing List:
      </Heading>

     {packingListEntriesGroupedByProductIdAndName.map(packingListEntrieGroupForProduct => <PackingListEntrieGroupForProduct data={packingListEntrieGroupForProduct} />) }


      {/* {packingListEntries.map((item) => {
        return (
          <SimpleGrid
            // minChildWidth={300}
            py={2}
            columns={6}
            borderBottom="1px"
            borderColor="gray.300"
            my={2}
            key={item.id}
          >
            <Box>{item.numberOfItems}</Box>
            <Box>{item.product.name}</Box>
            <Box>{item.size?.label}</Box>
            <Box>{item.product.gender}</Box>
            <Box>
              <IconButton
                background="transparent"
                onClick={() => onEditItemOnPackingListClick(item.id)}
                aria-label="Edit Packing List Item"
              >
                <EditIcon mx={2} color="teal" />
              </IconButton>
              <IconButton
                background="transparent"
                onClick={() => onRemoveItemFromPackingListClick(item.id)}
                aria-label="Remove Packing List Item"
              >
                <CloseIcon color="teal" />
              </IconButton>
            </Box>
          </SimpleGrid>
        );
      })} */}



    </>
  );
};

export default DistroEventDetailsForPlanningState;
