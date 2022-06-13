// import logo from "./logo.svg";
import "./App.css";
import { ethers } from "ethers";
import React, { useEffect } from "react";
import useSWR from "swr";
import { useState } from "react";
import { gql } from "@apollo/client";
import {
  nissohGraphClient,
  arbitrumGraphClient,
  avalancheGraphClient,
} from "./common";

const USD_DECIMALS = 30;
const AVALANCH_URL = "https://gmx-avax-server.uc.r.appspot.com";
const ARVITRUM_URL = "https://gmx-server-mainnet.uw.r.appspot.com";
const ARBITRUM = 42161;
const AVALANCHE = 43114;

export function bigNumberify(n) {
  return ethers.BigNumber.from(n);
}
export function numberWithCommas(x) {
  if (!x) {
    return "...";
  }
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}
function App() {
  const [totalVolume, setTotalVolume] = useState();
  const [openInterest, setOpenInterest] = useState();
  const [totalUser, setTotalUser] = useState();
  useEffect(() => {
    const getTotalTrading = async () => {
      const res1 = await fetch(`${ARVITRUM_URL}/total_volume`);
      const res2 = await fetch(`${AVALANCH_URL}/total_volume`);
      const response1 = await res1.json();
      const response2 = await res2.json();
      console.log("response = ", response1);
      console.log("response = ", response2);
      const arbitrumTotalVolumeSum = getTotalVolumeSum(response1);
      const avalancheTotalVolumeSum = getTotalVolumeSum(response2);
      let totalVolumeSum = bigNumberify(0);
      if (arbitrumTotalVolumeSum && avalancheTotalVolumeSum) {
        totalVolumeSum = totalVolumeSum.add(arbitrumTotalVolumeSum);
        totalVolumeSum = totalVolumeSum.add(avalancheTotalVolumeSum);
        setTotalVolume(totalVolumeSum);
      }

      const res3 = await fetch(`${AVALANCH_URL}/position_stats`);
      const avalanchePositionStats = await res3.json();
      const res4 = await fetch(`${ARVITRUM_URL}/position_stats`);
      const arbitrumPositionStats = await res4.json();
      let openInterest = bigNumberify(0);
      if (
        arbitrumPositionStats &&
        arbitrumPositionStats.totalLongPositionSizes &&
        arbitrumPositionStats.totalShortPositionSizes
      ) {
        openInterest = openInterest.add(
          arbitrumPositionStats.totalLongPositionSizes
        );
        openInterest = openInterest.add(
          arbitrumPositionStats.totalShortPositionSizes
        );
      }

      if (
        avalanchePositionStats &&
        avalanchePositionStats.totalLongPositionSizes &&
        avalanchePositionStats.totalShortPositionSizes
      ) {
        openInterest = openInterest.add(
          avalanchePositionStats.totalLongPositionSizes
        );
        openInterest = openInterest.add(
          avalanchePositionStats.totalShortPositionSizes
        );
      }
      setOpenInterest(openInterest);
    };
    getTotalTrading();
  }, []);
  const arbitrumUserStats = useUserStat(ARBITRUM);
  const avalancheUserStats = useUserStat(AVALANCHE);
  let totalUsers = 0;

  if (arbitrumUserStats && arbitrumUserStats.uniqueCount) {
    totalUsers += arbitrumUserStats.uniqueCount;
  }

  if (avalancheUserStats && avalancheUserStats.uniqueCount) {
    totalUsers += avalancheUserStats.uniqueCount;
  }
  // setTotalUser(totalUsers);
  function useUserStat(chainId) {
    const query = gql(`{
    userStat(id: "total") {
      id
      uniqueCount
    }
  }`);

    const [res, setRes] = useState();

    useEffect(() => {
      getGmxGraphClient(chainId)
        .query({ query })
        .then(setRes)
        .catch(console.warn);
    }, [setRes, query, chainId]);

    return res ? res.data.userStat : null;
  }
  function getGmxGraphClient(chainId) {
    if (chainId === ARBITRUM) {
      return arbitrumGraphClient;
    } else if (chainId === AVALANCHE) {
      return avalancheGraphClient;
    }
    throw new Error(`Unsupported chain ${chainId}`);
  }

  const formatAmount = (
    amount,
    tokenDecimals,
    displayDecimals,
    useCommas,
    defaultValue
  ) => {
    if (!defaultValue) {
      defaultValue = "...";
    }
    if (amount === undefined || amount.toString().length === 0) {
      return defaultValue;
    }
    if (displayDecimals === undefined) {
      displayDecimals = 4;
    }
    let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
    amountStr = limitDecimals(amountStr, displayDecimals);
    if (displayDecimals !== 0) {
      amountStr = padDecimals(amountStr, displayDecimals);
    }
    if (useCommas) {
      return numberWithCommas(amountStr);
    }
    return amountStr;
  };
  const limitDecimals = (amount, maxDecimals) => {
    let amountStr = amount.toString();
    if (maxDecimals === undefined) {
      return amountStr;
    }
    if (maxDecimals === 0) {
      return amountStr.split(".")[0];
    }
    const dotIndex = amountStr.indexOf(".");
    if (dotIndex !== -1) {
      let decimals = amountStr.length - dotIndex - 1;
      if (decimals > maxDecimals) {
        amountStr = amountStr.substr(
          0,
          amountStr.length - (decimals - maxDecimals)
        );
      }
    }
    return amountStr;
  };

  const padDecimals = (amount, minDecimals) => {
    let amountStr = amount.toString();
    const dotIndex = amountStr.indexOf(".");
    if (dotIndex !== -1) {
      const decimals = amountStr.length - dotIndex - 1;
      if (decimals < minDecimals) {
        amountStr = amountStr.padEnd(
          amountStr.length + (minDecimals - decimals),
          "0"
        );
      }
    } else {
      amountStr = amountStr + ".0000";
    }
    return amountStr;
  };

  function numberWithCommas(x) {
    if (!x) {
      return "...";
    }
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function getTotalVolumeSum(volumes) {
    if (!volumes || volumes.length === 0) {
      return;
    }

    let volume = bigNumberify(0);
    for (let i = 0; i < volumes.length; i++) {
      volume = volume.add(volumes[i].data.volume);
    }

    return volume;
  }
  // const { data: avalancheTotalVolume } = useSWR(
  //   "https://gmx-avax-server.uc.r.appspot.com/total_volume",
  //   {
  //     fetcher: (...args) => fetch(...args).then((res) => res.json()),
  //   }
  // );
  // console.log("data=", avalancheTotalVolume);
  return (
    <div className="App">
      hello
      <p>Total Trading Volume: $ {formatAmount(totalVolume, 30, 0, true)}</p>
      <p>Open Interest: ${formatAmount(openInterest, 30, 0, true)}</p>
      <p>Total Users: {numberWithCommas(totalUsers.toFixed(0))}</p>
    </div>
  );
}

export default App;
