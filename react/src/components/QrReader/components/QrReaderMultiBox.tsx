import { useState } from "react";
import { DeleteIcon } from "@chakra-ui/icons";
import { BiUndo } from "react-icons/bi";
import { Box, Center, IconButton, Radio, RadioGroup, Stack, Text } from "@chakra-ui/react";

interface IQrReaderMultiBoxProps {
  scannedBoxesCount: number;
  onDeleteScannedBoxes: () => void;
  onUndoLastScannedBox: () => void;
}

function QrReaderMultiBox({
  scannedBoxesCount,
  onDeleteScannedBoxes,
  onUndoLastScannedBox,
}: IQrReaderMultiBoxProps) {
  const [multiBoxAction, setMultiBoxAction] = useState("moveBox");
  return (
    <Stack direction="column">
      <Center>
        <Stack direction="row" alignItems="center">
          {scannedBoxesCount && (
            <IconButton
              aria-label="Delete list of scanned boxes"
              icon={<DeleteIcon />}
              size="sm"
              background="inherit"
              onClick={onDeleteScannedBoxes}
            />
          )}
          <Text as="b">Boxes Selected: {scannedBoxesCount}</Text>
          {scannedBoxesCount && (
            <IconButton
              aria-label="Undo last scan"
              icon={<BiUndo size={20} />}
              size="sm"
              background="inherit"
              onClick={onUndoLastScannedBox}
            />
          )}
        </Stack>
      </Center>

      <Box border="2px" borderRadius={0} p={4}>
        <RadioGroup onChange={setMultiBoxAction} value={multiBoxAction}>
          <Stack direction="column">
            <Radio value="moveBox">Move to Location</Radio>
            <Radio value="assignTag">Tag Boxes</Radio>
            <Radio value="assignShipment">Assign to Shipment</Radio>
          </Stack>
        </RadioGroup>
      </Box>
    </Stack>
  );
}

export default QrReaderMultiBox;
