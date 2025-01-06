"use client";
import React from "react";
import ChartThree from "../Charts/ChartThree";
import ChartTwo from "../Charts/ChartTwo";
import ChatCard from "../Chat/ChatCard";
import TableOne from "../Tables/TableOne";
import MapOne from "../Maps/MapOne";
import DataStatsOne from "@/components/DataStats/DataStatsOne";
import ChartOne from "@/components/Charts/ChartOne";

const ECommerce: React.FC = () => {
  return (
    <>
      <div className="flex justify-between">
        <div className="mb-4 flex flex-col items-start gap-0 leading-tight md:flex-row md:items-center md:gap-1">
          <h1 className="text-base font-medium text-dark md:text-lg">
            Welcome, James!{" "}
          </h1>
          <p className="text-sm md:text-base">
            Here&apos;s a snapshot of your activity.
          </p>
        </div>
        <div>
          <input type="date" name="date" id="date" className="p-1 rounded-md"/>
        </div>
      </div>
      <DataStatsOne />

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-6 2xl:gap-7.5">
        <ChartOne />
        <ChartTwo />
        {/* <ChartThree /> */}
        {/* <MapOne /> */}
        <div className="col-span-12 xl:col-span-8">
          <TableOne />
        </div>
        <ChatCard />
      </div>
    </>
  );
};

export default ECommerce;
