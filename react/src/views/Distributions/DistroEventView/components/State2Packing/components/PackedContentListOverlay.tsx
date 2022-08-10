import { CheckIcon } from "@chakra-ui/icons";
import {
  Badge, Box, Flex, Heading, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, Stat, StatGroup, StatLabel,
  StatNumber,
  Table,
  TableContainer,
  Tbody,
  Td, Text, Th,
  Thead,
  Tr
} from "@chakra-ui/react";
import { useMemo } from "react";
import {
  BoxData,
  IPackingListEntry,
  UnboxedItemsCollectionData
} from "views/Distributions/types";

export interface PackingActionListProps {
  onDeleteBoxFromDistribution: (boxId: string) => void;
}

interface PackedContentListOverlayProps {
  boxesData: BoxData[];
  unboxedItemCollectionData: UnboxedItemsCollectionData[];
  packingListEntry: IPackingListEntry;
}

const UnboxedItemsCollectionList = ({
  unboxedItemCollectionData,
}: {
  unboxedItemCollectionData: UnboxedItemsCollectionData[];
}) => (
  <>
    <Heading as="h3" size="md">
      Unboxed Items
    </Heading>
    <Flex direction="column">
      {unboxedItemCollectionData.map((unboxedItemsCollection, i) => (
        <Flex
          key={i}
          alignItems="center"
          my={2}
          // key={box.labelIdentifier}
          justifyContent="space-between"
        >
            {/* <Text mr={4}>{box.labelIdentifier}</Text> */}
            <Text>
              {" "}
              # of items: {unboxedItemsCollection.numberOfItems}
            </Text>
        </Flex>
      ))}
    </Flex>
  </>
);

const BoxesList = ({ boxesData }: { boxesData: BoxData[] }) => (
  <>
    <Heading as="h3" size="md">
      Boxes
    </Heading>
    <TableContainer mt={3}>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>Box Label</Th>
            <Th isNumeric># of items</Th>
          </Tr>
        </Thead>
        <Tbody>
          {boxesData.map((box) => (
            <Tr key={box.labelIdentifier}>
              <Td>{box.labelIdentifier}</Td>
              <Td isNumeric>{box.numberOfItems}</Td>
            </Tr>
            // <IconButton
            //   _hover={{
            //     backgroundColor: "transparent",
            //     opacity: "0.5",
            //   }}
            //   backgroundColor="transparent"
            //   aria-label="Delete"
            //   color="teal"
            //   icon={<DeleteIcon />}
            //   onClick={() => {
            //     // packingActionProps.onDeleteBoxFromDistribution(box.id)
            //   }}
            // />
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  </>
);

const PackedContentListOverlay = ({
  boxesData,
  unboxedItemCollectionData,
  packingListEntry,
}: // packingActionProps,
PackedContentListOverlayProps) => {
  const totalNumberOfPackedItems = useMemo(
    () =>
      boxesData.reduce((acc, box) => acc + box.numberOfItems, 0) +
      unboxedItemCollectionData.reduce(
        (acc, unboxedItemsCollection) =>
          acc + unboxedItemsCollection.numberOfItems,
        0
      ),
    [boxesData, unboxedItemCollectionData]
  );

  const missingNumberOfItems = useMemo(
    () => packingListEntry.numberOfItems - totalNumberOfPackedItems,
    [packingListEntry.numberOfItems, totalNumberOfPackedItems]
  );
  return (
    <>
      <ModalContent>
        <ModalHeader mx={4} pb={0}>
          <>
            <Heading as="h3" size="md">
              Packed Boxes and Items for : <br />
              {/* <Heading as="h2" size="lg"> */}
              <i>
                {packingListEntry.product.name} - {packingListEntry.size?.label}
              </i>
              {/* </Heading> */}
            </Heading>
          </>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody mx={4}>
          {boxesData.length > 0 && (
            <Box my={5}>
              <BoxesList boxesData={boxesData} />
            </Box>
          )}
          {unboxedItemCollectionData.length > 0 && (
            <Box my={5}>
              <UnboxedItemsCollectionList
                unboxedItemCollectionData={unboxedItemCollectionData}
              />
            </Box>
          )}

          <StatGroup my={5}>
            <Stat>
              <StatLabel>Packed # of items</StatLabel>
              <StatNumber>{totalNumberOfPackedItems}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Target # of items</StatLabel>
              <StatNumber>{packingListEntry.numberOfItems}</StatNumber>
            </Stat>
          </StatGroup>

          {missingNumberOfItems <= 0 && (
            <Badge colorScheme="green">
              {/* <CheckIcon /> Target number ({packingListEntry.numberOfItems}) fullfilled (with {totalNumberOfPackedItems} items) */}
              <CheckIcon /> Enough items packed
            </Badge>
          )}
          {missingNumberOfItems > 0 && (
            <Badge colorScheme="red">{missingNumberOfItems} items missing</Badge>
          )}
        </ModalBody>
        <ModalFooter />
      </ModalContent>
    </>
  );
};

export default PackedContentListOverlay;
