import {
  Box,
  Button,
  ButtonGroup,
  Center,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  Heading,
  IconButton,
  SimpleGrid,
  Table,
  TableCaption,
  TableContainer,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tr,
  useEditableControls,
  VStack,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon, EditIcon } from "@chakra-ui/icons";
import { IPackingListEntry } from "views/Distributions/types";
import _ from "lodash";
import { useEffect, useState } from "react";

interface IPackingListEntrieGroupForProduct {
  productId: string;
  productName: string;
  gender?: string;
  // category: string;
  packingListEntries: IPackingListEntry[];
}

type OnUpdatePackingListEntry = (
  packingListEntryId: string,
  numberOfItems: number
) => void;

interface PackingListEntryTableRowProps {
  entry: IPackingListEntry;
  onUpdatePackingListEntry: OnUpdatePackingListEntry;
}

const PackingListEntryTableRow = ({
  entry,
  onUpdatePackingListEntry,
}: PackingListEntryTableRowProps) => {
  const onChangeHandlerForEntry = (newVal: string) => {
    const newAmount = parseInt(newVal, 10);
    if (entry.numberOfItems === newAmount) {
      return;
    } else {
      onUpdatePackingListEntry(entry.id, newAmount);
    }
  };

  const [numberOfItemsFormValue, setNumberOfItemsFormValue] = useState(entry.numberOfItems);

  useEffect(() => {
    setNumberOfItemsFormValue(entry.numberOfItems);
  }, [entry]);


  return (
    <Tr key={entry.id}>
      {/* <Button onClick={() => {entry.numberOfItems = 123}}>Reset</Button> */}
      <Td>{entry.size?.label}</Td>
      <Td>
        <Editable
          // defaultValue={entry.numberOfItems.toString()}
          value={numberOfItemsFormValue.toString()}
          onChange={newVal => setNumberOfItemsFormValue(parseInt(newVal))}
          onSubmit={onChangeHandlerForEntry}
        >
          <EditablePreview width={20} />
          <EditableInput width={20} type="number" />
        </Editable>
      </Td>
    </Tr>
  );
};

const PackingListEntriesGroupForProduct = ({
  data,
  onUpdatePackingListEntry
}: {
  data: IPackingListEntrieGroupForProduct;
  onUpdatePackingListEntry: OnUpdatePackingListEntry
}) => {
  const { productName, gender, packingListEntries } = data;

  // const EditableControls = () => {
  //   const {
  //     isEditing,
  //     getSubmitButtonProps,
  //     getCancelButtonProps,
  //     getEditButtonProps,
  //   } = useEditableControls()

  //   return isEditing ? (
  //     <ButtonGroup justifyContent='center' size='sm'>
  //       <IconButton icon={<CheckIcon />} {...getSubmitButtonProps()} />
  //       <IconButton icon={<CloseIcon />} {...getCancelButtonProps()} />
  //     </ButtonGroup>
  //   ) : (
  //     <Flex justifyContent='center'>
  //       <IconButton size='sm' icon={<EditIcon />} {...getEditButtonProps()} />
  //     </Flex>
  //   )
  // }

  return (
    <Box pb={30}>
      <Heading
        as="h3"
        size="sm"
        backgroundColor={"gray.50"}
        textAlign="center"
        py={3}
      >
        {productName} ({gender})
      </Heading>

      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Size</Th>
              <Th>No. of items</Th>
            </Tr>
          </Thead>
          <Tbody>
            {packingListEntries.map((entry) => (
              <PackingListEntryTableRow key={entry.id} entry={entry} onUpdatePackingListEntry={onUpdatePackingListEntry} />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

interface DistroEventDetailsForPlanningStateProps {
  packingListEntries: IPackingListEntry[];
  onAddItemsClick: () => void;
  onCopyPackingListFromPreviousEventsClick: () => void;
  onRemoveItemFromPackingListClick: (packlistItemId: string) => void;
  onUpdatePackingListEntry: OnUpdatePackingListEntry;
}

const DistroEventDetailsForPlanningState = ({
  onUpdatePackingListEntry,
  packingListEntries,
  onAddItemsClick,
  onCopyPackingListFromPreviousEventsClick,
  onRemoveItemFromPackingListClick,
}: DistroEventDetailsForPlanningStateProps) => {
  // const packingListEntriesGroupedByProduct = _.groupBy(packingListEntries, (entry) => ({productId: entry.product.id, productName: entry.product.name}));
  const packingListEntriesGroupedByProductId = _.groupBy(
    packingListEntries,
    (entry) => entry.product.id
  );
  const packingListEntriesGroupedByProductIdAndName: IPackingListEntrieGroupForProduct[] =
    Object.keys(packingListEntriesGroupedByProductId).map((k) => {
      const product = packingListEntriesGroupedByProductId[k]?.[0]?.product;
      return {
        productId: k,
        productName: product?.name,
        gender: product.gender,
        // category: product.
        packingListEntries: packingListEntriesGroupedByProductId[k],
      };
    });

  return (
    <>
      <Flex w={[300, 400, 600]} direction="column" mb={4}>
        <Button onClick={() => onCopyPackingListFromPreviousEventsClick()}>
          Copy Packing List from Previous Event
        </Button>
        <Button my={2} onClick={() => onAddItemsClick()} colorScheme="blue">
          Select Products on List Entry
        </Button>
      </Flex>
      <Heading size={"md"}>Packing List</Heading>

      {packingListEntriesGroupedByProductIdAndName.map(
        (packingListEntrieGroupForProduct) => (
          <PackingListEntriesGroupForProduct
            key={packingListEntrieGroupForProduct.productId}
            data={packingListEntrieGroupForProduct}
            onUpdatePackingListEntry={onUpdatePackingListEntry}
          />
        )
      )}

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
