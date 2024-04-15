/*
 *     The Peacock Project - a HITMAN server replacement.
 *     Copyright (C) 2021-2024 The Peacock Project Team
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as React from "react"
import * as AlertDialog from "@radix-ui/react-alert-dialog"

type TransferAlertProps = {
    trigger: React.ReactElement
    doSync: () => void
}

function Speech() {
    return (
        <>
            This will <b>delete existing progress on this Peacock profile</b>.
            <br />
            Your progress will be replaced with whatever you have completed on
            the official servers.
            <br />
            <br />
            <b>THIS CANNOT BE UNDONE. Are you SURE you want to continue?</b>
            <br />
            <br />
            <b>
                You may want to make a copy of your <code>userdata</code> folder
                first.
            </b>
        </>
    )
}

export function TransferAlert(props: TransferAlertProps) {
    return (
        <AlertDialog.Root>
            <AlertDialog.Trigger asChild>{props.trigger}</AlertDialog.Trigger>

            <AlertDialog.Portal>
                <AlertDialog.Overlay className="AlertDialogOverlay" />

                <AlertDialog.Content className="AlertDialogContent">
                    <AlertDialog.Title className="AlertDialogTitle">
                        <b>Danger!</b> Are you sure you want to continue?
                    </AlertDialog.Title>

                    <AlertDialog.Description className="AlertDialogDescription">
                        <Speech />
                    </AlertDialog.Description>

                    <div
                        style={{
                            display: "flex",
                            gap: 25,
                            justifyContent: "flex-end",
                        }}
                    >
                        <AlertDialog.Cancel asChild>
                            <button className="button button--primary">
                                Cancel
                            </button>
                        </AlertDialog.Cancel>

                        <AlertDialog.Action asChild>
                            <button
                                className="button button--danger"
                                onClick={props.doSync}
                            >
                                Yes, sync now
                            </button>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}
