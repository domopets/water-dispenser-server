#!/bin/bash

systemctl stop WaterDispenserServer.service
systemctl disable WaterDispenserServer.service
rm /etc/systemd/system/WaterDispenserServer.service
