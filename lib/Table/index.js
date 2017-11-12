/**
 * @file: index
 * @author: Cuttle Cong
 * @date: 2017/11/11
 * @description: 
 */

import React from 'picidae/exports/react';

export default class Table extends React.Component {
    static defaultProps = {
        classNameList: [

        ],
        body: [

        ],

        head: [

        ]
    }

    render() {
        const {head, body, classNameList} = this.props

        return (
            <table className="transformer-react-code">
                <thead>
                    <tr>
                        {head.map((value, i) => <th className={'th-' + classNameList[i]} key={i}>{value}</th>)}
                    </tr>
                </thead>
                <tbody>
                {
                    body.map((row, i) => (
                        <tr key={i}>
                            {row.map((value, j) =>
                                <td key={`${i}-${j}`}
                                    className={'tr-' + classNameList[i]}
                                    dangerouslySetInnerHTML={{__html: value}}
                                />
                            )}
                        </tr>
                    ))
                }
                </tbody>
            </table>
        );
    }
}