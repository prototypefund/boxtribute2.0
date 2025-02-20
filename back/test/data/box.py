from datetime import datetime

import pytest
from boxtribute_server.enums import BoxState
from boxtribute_server.models.definitions.box import Box

from .box_state import default_box_state_data
from .location import another_location_data, default_location_data
from .product import data as product_data
from .qr_code import another_qr_code_with_box_data, default_qr_code_data
from .size import default_data as size_data
from .user import default_user_data


def default_box_data():
    return {
        "id": 2,
        "product": product_data()[0]["id"],
        "label_identifier": "12345678",
        "state": default_box_state_data()["id"],
        "last_modified_on": datetime(2020, 11, 27),
        "last_modified_by": default_user_data()["id"],
        "created_on": datetime(2020, 11, 27),
        "created_by": default_user_data()["id"],
        "number_of_items": 0,
        "size": size_data()["id"],
        "location": default_location_data()["id"],
        "qr_code": default_qr_code_data()["id"],
    }


def box_without_qr_code_data():
    data = default_box_data()
    data["id"] = 3
    data["label_identifier"] = "23456789"
    data["number_of_items"] = 10
    data["qr_code"] = None
    data["state"] = BoxState.MarkedForShipment
    return data


def another_box_data():
    data = box_without_qr_code_data()
    data["id"] = 4
    data["label_identifier"] = "34567890"
    data["location"] = another_location_data()["id"]
    return data


def lost_box_data():
    data = box_without_qr_code_data()
    data["id"] = 5
    data["label_identifier"] = "45678901"
    data["state"] = BoxState.Lost
    return data


def marked_for_shipment_box_data():
    data = box_without_qr_code_data()
    data["id"] = 6
    data["label_identifier"] = "56789012"
    data["last_modified_on"] = datetime(2021, 2, 2)
    return data


def another_marked_for_shipment_box_data():
    data = marked_for_shipment_box_data()
    data["id"] = 7
    data["label_identifier"] = "67890123"
    data["last_modified_on"] = datetime(2021, 2, 2)
    return data


def box_in_another_location_with_qr_code_data():
    data = default_box_data()
    data["id"] = 8
    data["label_identifier"] = "78901234"
    data["location"] = another_location_data()["id"]
    data["qr_code"] = another_qr_code_with_box_data()["id"]
    return data


def data():
    return [
        another_box_data(),
        default_box_data(),
        box_without_qr_code_data(),
        lost_box_data(),
        marked_for_shipment_box_data(),
        another_marked_for_shipment_box_data(),
        box_in_another_location_with_qr_code_data(),
    ]


@pytest.fixture
def default_boxes():
    return data()


@pytest.fixture
def default_location_boxes():
    return data()[1:-1]


@pytest.fixture
def default_box():
    return default_box_data()


@pytest.fixture
def box_without_qr_code():
    return box_without_qr_code_data()


@pytest.fixture
def another_box():
    return another_box_data()


@pytest.fixture
def lost_box():
    return lost_box_data()


@pytest.fixture
def marked_for_shipment_box():
    return marked_for_shipment_box_data()


@pytest.fixture
def another_marked_for_shipment_box():
    return another_marked_for_shipment_box_data()


def create():
    Box.insert_many(data()).execute()
