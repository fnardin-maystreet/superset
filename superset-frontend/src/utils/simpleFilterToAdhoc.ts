/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  AdhocFilter,
  isAdhocColumn,
  QueryObjectFilterClause,
  SimpleAdhocFilter,
} from '@superset-ui/core';
import {
  Clauses,
  ExpressionTypes,
} from '../explore/components/controls/FilterControl/types';
import { OPERATOR_ENUM_TO_OPERATOR_TYPE } from '../explore/constants';
import { translateToSql } from '../explore/components/controls/FilterControl/utils/translateToSQL';

const findMatchingFilterKey = (
  filterClause: QueryObjectFilterClause & {
    filterDataMapping?: Record<string, any[]>;
    layerFilterScope?: Record<string, any>;
  },
): string | null => {
  if (!filterClause.filterDataMapping) {
    return null;
  }

  const { col, op } = filterClause;
  const val = 'val' in filterClause ? filterClause.val : undefined;

  for (const [key, filters] of Object.entries(filterClause.filterDataMapping)) {
    if (Array.isArray(filters)) {
      const matchingFilter = filters.find(
        filter =>
          filter.col === col &&
          filter.op === op &&
          JSON.stringify(filter.val) === JSON.stringify(val),
      );

      if (matchingFilter) {
        return key;
      }
    }
  }

  return null;
};

export const simpleFilterToAdhoc = (
  filterClause: QueryObjectFilterClause & {
    filterDataMapping?: Record<string, any[]>;
    layerFilterScope?: Record<string, any>;
  },
  clause: Clauses = Clauses.Where,
) => {
  // Find matching filter key
  const matchingFilterKey = findMatchingFilterKey(filterClause);
  const filterScope = matchingFilterKey
    ? filterClause.layerFilterScope?.[matchingFilterKey]
    : undefined;

  let result: AdhocFilter;
  if (isAdhocColumn(filterClause.col)) {
    result = {
      expressionType: 'SQL',
      clause,
      sqlExpression: translateToSql({
        expressionType: ExpressionTypes.Simple,
        subject: `(${filterClause.col.sqlExpression})`,
        operator: filterClause.op,
        comparator: 'val' in filterClause ? filterClause.val : undefined,
      } as SimpleAdhocFilter),
    };
  } else {
    result = {
      expressionType: 'SIMPLE',
      clause,
      operator: filterClause.op,
      operatorId: Object.entries(OPERATOR_ENUM_TO_OPERATOR_TYPE).find(
        operatorEntry => operatorEntry[1].operation === filterClause.op,
      )?.[0],
      subject: filterClause.col,
      comparator: 'val' in filterClause ? filterClause.val : undefined,
    } as SimpleAdhocFilter;
  }
  if (filterClause.isExtra) {
    Object.assign(result, {
      isExtra: true,
      layerFilterScope: filterScope,
      filterOptionName: `filter_${Math.random()
        .toString(36)
        .substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`,
    });
  }
  return result;
};
