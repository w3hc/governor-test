import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"

describe("Governor test", function () {
    async function deployContracts() {
        const [deployer, alice, bob, francis] = await ethers.getSigners()

        const uri =
            "ipfs://bafkreih2ac5yabo2daerkw5w5wcwdc7rveqejf4l645hx2px26r5fxfnpe"
        const firstMembers = [alice.address, bob.address]

        const nftName = "Membership NFT"
        const symbol = "MEMBER"
        const NFT = await ethers.getContractFactory("NFT")
        const nft = await NFT.deploy(
            deployer,
            firstMembers,
            uri,
            nftName,
            symbol
        )

        const name = "MyGovernor"
        const votingDelay = 1 // 1 second
        const votingPeriod = 60 * 60 * 24 * 15 // 15 days
        const votingThreshold = 1
        const quorum = 20 // 20%

        const Gov = await ethers.getContractFactory("MyGovernor")
        const gov = await Gov.deploy(
            await nft.getAddress(),
            name,
            votingDelay,
            votingPeriod,
            votingThreshold,
            quorum
        )

        await nft.transferOwnership(await gov.getAddress())
        await nft.connect(alice).delegate(alice.address)
        await nft.connect(bob).delegate(alice.address)

        return { gov, nft, alice, bob, francis, votingPeriod }
    }

    describe("Deployment", function () {
        it("Should return the right nft contract address", async function () {
            const { gov, nft } = await loadFixture(deployContracts)
            expect(await gov.token()).to.equal(await nft.getAddress())
        })
    })

    describe("Interactions", function () {
        it("Should not allow francis to call propose", async function () {
            const { gov, nft, alice, francis } = await loadFixture(
                deployContracts
            )

            // Alice is a member
            expect(await nft.balanceOf(alice.address)).to.equal(1)

            // Francis is not a member
            expect(await nft.balanceOf(francis.address)).to.equal(0)

            // Preparing the call
            const call = "0x"
            const calldatas = [call.toString()]
            const PROPOSAL_DESCRIPTION = "proposal description"
            const targets = [alice.address]
            const values = ["100000000000000"]

            // Alice submits a proposal -> should go through
            await expect(
                gov
                    .connect(alice)
                    .propose(targets, values, calldatas, PROPOSAL_DESCRIPTION)
            ).not.to.be.reverted

            // francis submits a proposal -> should fail
            await expect(
                gov
                    .connect(francis)
                    .propose(targets, values, calldatas, PROPOSAL_DESCRIPTION)
            ).to.be.reverted
        })
    })
})
