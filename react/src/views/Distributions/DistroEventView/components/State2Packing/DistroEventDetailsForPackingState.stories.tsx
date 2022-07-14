import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { ProductGender } from 'types/generated/graphql';
import DistroEventDetailsForPackingState from './DistroEventDetailsForPackingState';
// import { DistroEvent } from "../State1Planning/DistroEventPlanning";
import { action } from '@storybook/addon-actions';
import { BoxData, IPackingListEntry } from 'views/Distributions/types';
import { PackingActionProps } from './Overlays/PackingBoxDetailsOverlay';
import { PackingActionListProps } from './Overlays/PackedListOverlay';


const mockedDistroEventPackingList: IPackingListEntry[] =
  [
    {
      id: "3",
      numberOfItems: 32,
      size: {
        id: "123",
        label: "M",
      },
      product: {
        id: "1",
        name: "T-shirt",
      },
      gender: ProductGender.Men,
    },
    {
      id: "4",
      numberOfItems: 10,
      size: {
        id: "234",
        label: "S",
      },
      product: {
        id: "2",
        name: "T-shirt"
      },
      gender: ProductGender.Women,
    },
  ];



const mockedBoxesData: BoxData[] = [{
  labelIdentifier: "23982",
  product: {
    id: "3",
    name: "Jacket Woman",
  },
  size: {
    id: "1",
    label: "M"
  },
  numberOfItems: 42,
},
{
  labelIdentifier: "23942",
  product: {
    id: "2",
    name: "Jacket Male"
  },
  size: {
    id: "2",
    label: "S"
  },
  numberOfItems: 23,
}]

const mockedBoxData: BoxData ={
  labelIdentifier: "23942",
  product: {
    id: "3",
    name: "Jacket Woman",
  },
  size: {
    id: "1",
    label: "M"
  },
  numberOfItems: 23,
}

const mockedPackingActionProps: PackingActionProps = {
  onBoxToDistribution: action("onBoxToDistribution"),
  onMoveItemsToDistribution: action("onMoveItemsToDistribution")
}

const mockedPackingActionListProps: PackingActionListProps = {
  onDeleteBoxFromDistribution: action("onDeleteBoxFromDistribution"),
}

export default {
  title: 'Mobile Distro Events/Distro Events/Detail View/State: 4 - Packing/Component',
  component: DistroEventDetailsForPackingState,
  parameters: {
  },
} as ComponentMeta<typeof DistroEventDetailsForPackingState>;

const Template: ComponentStory<typeof DistroEventDetailsForPackingState> = (args) => <DistroEventDetailsForPackingState {...args} />;

export const Default = Template.bind({});
Default.args = {
  packingListEntries: mockedDistroEventPackingList,
  // boxData: mockedBoxData,
  // boxesData: mockedBoxesData,
  // onShowListClick: action('onShowListClick'),
  // packingActionProps: mockedPackingActionProps,
  // packingActionListProps: mockedPackingActionListProps,
  //   onCheckboxClick: action('onCheckboxClick'),
}
