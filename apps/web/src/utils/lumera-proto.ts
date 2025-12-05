import * as protobuf from 'protobufjs';  // Import full protobufjs

const protoDefinition = `
syntax = "proto3";

package lumera.action.v1;

enum ActionType {
  ACTION_TYPE_UNSPECIFIED = 0;
  ACTION_TYPE_CASCADE = 1;
  ACTION_TYPE_SENSE = 2;
  // Thêm enum khác nếu cần từ Lumera SDK
}

message Action {
  string id = 1;
  string creator = 2;
  ActionType type = 3;
  // ... các fields khác nếu cần
  oneof metadata {
    CascadeMetadata cascade = 10;
    SenseMetadata sense = 11;
  }
}

message CascadeMetadata {
  string data_hash = 1;
  string file_name = 2;
  uint64 rqids_ic = 3;
  uint64 rqids_max = 4;
  repeated string rqids_ids = 5;
  string signatures = 6;
  bool public = 7;
}

message SenseMetadata {
  string data_hash = 1;
  string collection_id = 2;
  string group_id = 3;
  uint64 ddand_fingerprints_ic = 4;
  uint64 ddand_fingerprints_max = 5;
  repeated string ddand_fingerprints_ids = 6;
  string signatures = 7;
}
`;

export const loadProto = () => {
  const root = protobuf.parse(protoDefinition).root;
  return {
    Action: root.lookupType('lumera.action.v1.Action'),
    CascadeMetadata: root.lookupType('lumera.action.v1.CascadeMetadata'),
    SenseMetadata: root.lookupType('lumera.action.v1.SenseMetadata'),
  };
};
